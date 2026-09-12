/// <reference types="@cloudflare/workers-types" />

import { conciergeReply, conciergeReplyWithCard, type ConciergeEnv, type ConciergeMsg } from "../../lib/concierge";
import { classifyReply } from "../../lib/gemini";
import { sendMail, mailEnabled, type MailEnv } from "../../lib/mailer";
import { getOwnerEmail, getSetting } from "../../lib/settings";
import { tgAlertOwner, tgEscape, type TgButton, type TgEnv } from "../../lib/telegram";
import {
  waConfig, waReady, waSendText, waSendProduct, waSendProductList, waSendCtaUrl, waMarkRead, waVerifySignature,
  type WaEnv, type WaConfig,
} from "../../lib/whatsapp";
import { issuePaymentLink, callPriceInr } from "../../lib/payments";
import { upcomingBooking, BOOKING_CHANGE, BOOKING_ASK } from "../../lib/bookings";

interface Env extends ConciergeEnv, WaEnv, MailEnv, TgEnv {
  DB: D1Database;
}

/**
 * How long the guide stays quiet after a person replies in a thread.
 *
 * Long enough that the guide never interrupts a live exchange; short enough that
 * an unanswered customer is not left with nobody at all. The failure this
 * replaces was unbounded: one manual reply silenced the guide on that thread for
 * good.
 */
const HANDOVER_MS = 30 * 60 * 1000;

/**
 * Someone asking for a person, in the ways Indian customers actually write it.
 * Deliberately narrow: a false positive needlessly pulls the owner in, so this
 * matches explicit requests rather than any mention of a human.
 */
const WANTS_HUMAN =
  /\b(talk|speak|chat)\s+(to|with)\s+(a\s+)?(human|person|someone|real|agent|expert)\b|\bhuman\b.*\b(please|chahiye)\b|\b(call me|call back|callback)\b|किसी\s*से\s*बात|इंसान\s*से\s*बात|बात\s*कर(नी|ना)\s*है/i;

/** One WhatsApp thread per phone number, stored beside the website chats. */
const sessionFor = (phone: string) => `wa:${phone}`;

interface Inbound {
  id: string;
  from: string;
  text: string;
  name: string;
  /** Set when the customer sent a cart from the catalogue. */
  order?: { retailerId: string; qty: number }[];
}

/** Pull the text messages out of a Meta webhook payload; ignore everything else. */
function parseInbound(body: any): Inbound[] {
  const out: Inbound[] = [];
  for (const entry of body?.entry || []) {
    for (const change of entry?.changes || []) {
      const v = change?.value;
      // Delivery and read receipts arrive on this same hook and are not messages.
      if (!v?.messages) continue;
      const nameOf = (wa: string) =>
        (v.contacts || []).find((c: any) => c?.wa_id === wa)?.profile?.name || "";
      for (const m of v.messages) {
        let text =
          m?.text?.body ||
          m?.button?.text ||
          m?.interactive?.button_reply?.title ||
          m?.interactive?.list_reply?.title ||
          "";
        if (!m?.id || !m?.from) continue;
        // A cart sent from the catalogue. Stored as readable text so the
        // transcript, the guide and the owner all see the same thing.
        let order: Inbound["order"];
        if (m?.type === "order" && Array.isArray(m?.order?.product_items)) {
          order = m.order.product_items.map((p: any) => ({
            retailerId: String(p?.product_retailer_id || ""),
            qty: Number(p?.quantity || 1),
          }));
          text = "Cart: " + (order || []).map((o) => `${o.retailerId} ×${o.qty}`).join(", ") + (m.order.text ? ` — ${m.order.text}` : "");
        }
        out.push({ id: m.id, from: String(m.from), text: String(text), name: nameOf(m.from), ...(order ? { order } : {}) });
      }
    }
  }
  return out;
}

/**
 * Devanagari in the message is the only reliable signal available; a phone
 * number says nothing about which language its owner writes in. Otherwise keep
 * whatever the thread has been using, so one English word cannot flip it.
 */
function langFor(text: string, previous: string | null): string {
  if (/[ऀ-ॿ]/.test(text)) return "hi";
  return previous === "hi" && !/[a-zA-Z]{4,}/.test(text) ? "hi" : "en";
}

/**
 * A Meta webhook carries no cf-ipcountry, so the dialling code is the only clue
 * to which market this person is in — and getting it wrong means quoting a
 * Dubai customer in rupees. Only the codes we actually price for are mapped;
 * anything else falls through to the default market rather than guessing.
 */
function countryFromPhone(phone: string): string {
  const p = String(phone || "");
  const CODES: [string, string][] = [
    ["91", "IN"], ["971", "AE"], ["966", "SA"], ["974", "QA"], ["965", "KW"],
    ["968", "OM"], ["973", "BH"], ["44", "GB"], ["61", "AU"], ["65", "SG"],
    ["880", "BD"], ["92", "PK"], ["94", "LK"], ["977", "NP"],
  ];
  // Longest prefix first, so 971 is not swallowed by 91.
  for (const [code, cc] of CODES.sort((x, y) => y[0].length - x[0].length)) {
    if (p.startsWith(code)) return cc;
  }
  if (p.startsWith("1")) return "US";
  return "";
}

/** Meta retries a webhook until it gets a 200; without this the guide replies twice. */
async function alreadyHandled(db: D1Database, id: string): Promise<boolean> {
  try {
    const r = await db
      .prepare("INSERT OR IGNORE INTO wa_events (id, created_at) VALUES (?, datetime('now'))")
      .bind(id)
      .run();
    // Zero rows changed → the id was already stored → this is a retry.
    return (r as any)?.meta?.changes === 0;
  } catch {
    return false; // never drop a real customer message over bookkeeping
  }
}

/**
 * Webhook verification. Meta calls this once when the callback URL is saved and
 * expects the challenge echoed back as plain text.
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const u = new URL(request.url);
  const mode = u.searchParams.get("hub.mode");
  const token = u.searchParams.get("hub.verify_token");
  const challenge = u.searchParams.get("hub.challenge") || "";
  const cfg = await waConfig(env.DB, env);
  if (mode === "subscribe" && cfg.verifyToken && token === cfg.verifyToken) {
    return new Response(challenge, { status: 200, headers: { "content-type": "text/plain" } });
  }
  return new Response("forbidden", { status: 403 });
};

/**
 * Inbound WhatsApp messages on the verified WABA → the same GoLuQ guide that
 * answers on the website, replying 24x7 from the business number.
 *
 * Every path returns 200. A non-200 makes Meta retry the same payload for hours
 * and can get the webhook disabled outright, so failures are logged and
 * swallowed rather than surfaced.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const raw = await request.text();
  const cfg = await waConfig(env.DB, env);

  // Anyone who learned this URL could otherwise make the guide talk to strangers
  // on our bill. Once an app secret is set, an unsigned request is refused.
  if (cfg.appSecret) {
    const ok = await waVerifySignature(cfg, raw, request.headers.get("x-hub-signature-256"));
    if (!ok) return new Response("bad signature", { status: 403 });
  }

  let body: any = {};
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("ok");
  }

  // Delivery receipts ride the same hook. Without them a campaign can only
  // report "we sent it", which is the least interesting thing about a campaign —
  // delivered, read and replied are what say whether it worked.
  await recordStatuses(env.DB, body);

  const messages = parseInbound(body);
  if (!messages.length || !waReady(cfg)) return new Response("ok");

  for (const m of messages) {
    try {
      if (await alreadyHandled(env.DB, m.id)) continue;
      await handleMessage(env, cfg, m);
    } catch (e) {
      console.log("wa inbound failed:", String(e).slice(0, 300));
    }
  }
  return new Response("ok");
};

async function handleMessage(env: Env, cfg: WaConfig, m: Inbound): Promise<void> {
  const sid = sessionFor(m.from);
  const db = env.DB;

  const prior = await db
    .prepare("SELECT lang, closed, agent_joined, bot_off FROM chat_sessions WHERE id = ?")
    .bind(sid)
    .first<{ lang: string | null; closed: number; agent_joined: number; bot_off: number }>();
  const isNew = !prior;
  const lang = langFor(m.text, prior?.lang ?? null);

  await db
    .prepare(
      `INSERT INTO chat_sessions (id, created_at, last_at, page, lang, visitor_name, visitor_phone)
       VALUES (?, datetime('now'), datetime('now'), 'whatsapp', ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         last_at = datetime('now'),
         lang = excluded.lang,
         unread_for_agent = unread_for_agent + 1,
         visitor_name = COALESCE(NULLIF(chat_sessions.visitor_name, ''), excluded.visitor_name)`
    )
    .bind(sid, lang, m.name, m.from)
    .run();

  await db
    .prepare(
      `INSERT INTO chat_messages (session_id, role, content, created_at)
       VALUES (?, 'visitor', ?, datetime('now'))`
    )
    .bind(sid, m.text.slice(0, 2000))
    .run();

  await waMarkRead(cfg, m.id);

  // A reply to a campaign is the whole point of having sent one.
  await markReplied(db, m.from);

  // A call already in the diary changes what every other reply should say:
  // no fresh calendar, and a change request goes to the owner, not the guide.
  // This runs BEFORE the opt-out classifier: "cancel my call" is a change
  // request, not a request to be left alone — the classifier once read it as
  // STOP and closed the thread.
  const booking = await upcomingBooking(db, m.from, null);
  if (booking && (BOOKING_CHANGE.test(m.text) || BOOKING_ASK.test(m.text))) {
    const change = BOOKING_CHANGE.test(m.text);
    const text = change
      ? (lang === "hi"
        ? `आपकी कॉल ${booking.whenIst} IST पर तय है। दुष्यंत को बता दिया है — वे इसे बदलकर/रद्द करके यहीं पुष्टि करेंगे। नया समय कौन-सा ठीक रहेगा?`
        : `Your call is booked for ${booking.whenIst} IST. Dushyant has been told — he will move or cancel it and confirm here. Which new time suits you?`)
      : (lang === "hi"
        ? `आपकी कॉल पहले से ${booking.whenIst} IST पर तय है${booking.meetUrl ? ` — Meet लिंक: ${booking.meetUrl}` : ""}। बदलना हो तो यहीं लिख दीजिए।`
        : `Your call is already booked for ${booking.whenIst} IST${booking.meetUrl ? ` — Meet link: ${booking.meetUrl}` : ""}. If you need to change it, just say so here.`);
    const sent = await waSendText(cfg, m.from, text);
    if (sent.ok) {
      await db.prepare(`INSERT INTO chat_messages (session_id, role, content, created_at) VALUES (?, 'guide', ?, datetime('now'))`).bind(sid, text).run();
      if (change) {
        await db.prepare("UPDATE chat_sessions SET needs_human = 1 WHERE id = ?").bind(sid).run();
        await tgAlertOwner(env.DB, env, [
          `🔁 <b>Call change requested</b> · ${tgEscape(m.name || m.from)}`,
          `Booked: ${tgEscape(booking.whenIst)} IST`,
          `They wrote: <i>${tgEscape(m.text.slice(0, 300))}</i>`,
          "Move or cancel it in Google Calendar; the bridge updates the cockpit and the customer gets the confirmation here.",
        ].join("\n"), { buttons: [[{ text: "Open WhatsApp", url: `https://wa.me/${m.from}` }, { text: "Google Calendar", url: "https://calendar.google.com/calendar/r" }]] }).catch(() => {});
      }
      await tgPush(env, m, sid, { why: change ? "asked to change a booked call" : "", reply: text });
      return;
    }
  }


  // Someone asking to be left alone is asking once. Honour it, confirm it, and
  // never let the guide speak to them again.
  if ((await classifyReply(env, m.text)) === "stop") {
    await db.prepare("UPDATE chat_sessions SET closed = 1 WHERE id = ?").bind(sid).run();
    const bye = lang === "hi"
      ? "ठीक है, अब आपको हमारी ओर से कोई संदेश नहीं आएगा। ज़रूरत हो तो कभी भी लिख दीजिए।"
      : "Done — you won't hear from us again. Message any time if you need us.";
    await waSendText(cfg, m.from, bye);
    await db.prepare(`INSERT INTO chat_messages (session_id, role, content, created_at) VALUES (?, 'guide', ?, datetime('now'))`).bind(sid, `${bye} [thread closed: opt-out]`).run();
    await tgPush(env, m, sid, { why: "asked to stop — conversation closed", buttons: false });
    return;
  }

  if (prior?.closed) return;

  // The owner has switched the guide off for this person, deliberately.
  if (prior?.bot_off) {
    await notifyOwner(env, m, "message on a thread you are handling", { botOff: true });
    return;
  }

  // A person is actively in this conversation — stay out of their way, but only
  // while they are actually there.
  //
  // This used to key off `agent_joined`, which is set forever by a single manual
  // reply. One "what you like?" from the cockpit muted the guide on that thread
  // permanently: nine later messages were stored, emailed, and never answered.
  // Handing back after a quiet spell is the difference between a colleague
  // stepping aside and a bot that silently quits.
  const lastAgent = await db
    .prepare(
      `SELECT created_at FROM chat_messages
        WHERE session_id = ? AND role = 'agent' ORDER BY id DESC LIMIT 1`
    )
    .bind(sid)
    .first<{ created_at: string }>();
  if (lastAgent?.created_at) {
    const idleMs = Date.now() - Date.parse(lastAgent.created_at.replace(" ", "T") + "Z");
    if (Number.isFinite(idleMs) && idleMs < HANDOVER_MS) {
      await notifyOwner(env, m, "reply on a thread you are handling");
      return;
    }
  }

  // Asking for a person is not a question the guide should answer away. Flag it
  // so the cockpit shows it as waiting, tell the owner, and let the guide say a
  // person is coming rather than going silent — silence is what makes someone
  // give up and message a competitor.
  const wantsHuman = WANTS_HUMAN.test(m.text);
  if (wantsHuman) {
    await db.prepare("UPDATE chat_sessions SET needs_human = 1 WHERE id = ?").bind(sid).run();
    // Email now; Telegram once the guide has answered, so the alert carries
    // both what they said and what they were told.
    await notifyOwner(env, m, "asked to speak to a person", { telegram: false });
  }

  const why = wantsHuman ? "asked to speak to a person" : isNew ? "new WhatsApp conversation" : "";
  const catalogId = (await getSetting(db, "wa_catalog_id")) || "";

  // A cart is a buying signal, not a question: tell the owner at once, and
  // answer with the next concrete step — a slot to pick for the founder call,
  // a payment link for anything else.
  if (m.order?.length) {
    await notifyOwner(env, m, "sent a cart from the catalogue");
    const handled = await handleCart(env, cfg, m, sid, lang);
    if (handled) {
      await tgPush(env, m, sid, { why, reply: handled });
      return;
    }
  }

  // "Price list" / "catalogue" is the one request with a better answer than
  // prose: the whole catalogue as tappable products.
  if (catalogId && !m.order && CATALOGUE_ASK.test(m.text)) {
    const sent = await waSendProductList(
      cfg, m.from, catalogId,
      lang === "hi" ? "GoLuQ की सेवाएँ" : "GoLuQ services",
      lang === "hi"
        ? "यहाँ हमारी पूरी सूची है। किसी पर टैप करके देखिए, या बताइए आपके बिज़नेस में क्या अटकता है — मैं सही चीज़ सुझाऊँगा।"
        : "Here is everything we build and set up. Tap any item to see it, or tell me what is slowing your business down and I will point you to the right one.",
      CATALOGUE_SECTIONS,
      lang === "hi" ? "कीमतें भारत के लिए, ₹ में" : "Prices for India, in ₹"
    );
    if (sent.ok) {
      await db.prepare(`INSERT INTO chat_messages (session_id, role, content, created_at) VALUES (?, 'guide', ?, datetime('now'))`)
        .bind(sid, "[Sent the catalogue as a product list]").run();
      await tgPush(env, m, sid, { why, reply: "(sent the catalogue as a product list)" });
      return;
    }
    console.log("product list not sent:", sent.error);
  }

  const history = await db
    .prepare("SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY id DESC LIMIT 10")
    .bind(sid)
    .all<{ role: string; content: string }>();

  const msgs: ConciergeMsg[] = (history.results || [])
    .reverse()
    .map((r) => ({ role: r.role === "visitor" ? "user" : "assistant", content: r.content }));

  const already = await cardsSent(db, sid);
  const { reply, card } = await conciergeReplyWithCard(env, {
    messages: msgs,
    lang,
    country: countryFromPhone(m.from),
    cardIds: catalogId ? CARD_IDS.filter((id) => !already.includes(id)) : [],
    context:
      "\nThe customer is messaging the GoLuQ business number on WhatsApp, so keep replies SHORT — two or three lines, the way people actually message. " +
      "They came to us, which means they already have something in mind: find out what business they run and what they need, then name a price. " +
      "You cannot show them a demo here, so close on either a quote or a call from a real person." +
      (m.order?.length
        ? " THEY JUST SENT A CART FROM OUR CATALOGUE (listed above as 'Cart: …'). Thank them, confirm what they picked in plain words, and say Dushyant will message them to agree scope and next steps — do not invent totals or delivery dates."
        : "") +
      (booking
        ? ` THIS CUSTOMER ALREADY HAS A CALL BOOKED WITH DUSHYANT FOR ${booking.whenIst} IST. Do not offer the calendar or ask them to book; refer to that call. If they want to change it, say Dushyant will move it and confirm here.`
        : "") +
      (wantsHuman
        ? " THEY HAVE ASKED TO SPEAK TO A PERSON. Say plainly that Dushyant has been told and will reply here himself shortly. Do not argue or try to handle it yourself — but do ask what they need, so he has it in front of him when he arrives."
        : ""),
  });

  const sent = await waSendText(cfg, m.from, reply);
  if (!sent.ok) {
    // Almost always the 24-hour window: free-form text is only deliverable
    // within 24h of the customer's last message. Nothing here is retryable.
    console.log("wa reply not delivered:", sent.error);
    await tgPush(env, m, sid, { why, note: `Guide could not reply: ${sent.error}` });
    return;
  }

  await db
    .prepare(
      `INSERT INTO chat_messages (session_id, role, content, created_at)
       VALUES (?, 'guide', ?, datetime('now'))`
    )
    .bind(sid, reply.slice(0, 2000))
    .run();

  // The product card follows the words, never replaces them.
  if (card && catalogId) {
    const shown = await waSendProduct(cfg, m.from, catalogId, card);
    if (shown.ok) {
      await rememberCard(db, sid, already, card);
      await db.prepare(`INSERT INTO chat_messages (session_id, role, content, created_at) VALUES (?, 'guide', ?, datetime('now'))`)
        .bind(sid, `[Showed product card: ${card}]`).run();
    } else {
      console.log("product card not sent:", shown.error);
    }
  }

  if (isNew && !wantsHuman) await notifyOwner(env, m, "new WhatsApp conversation", { telegram: false });
  await tgPush(env, m, sid, { why, reply: card ? `${reply}\n[+ product card: ${card}]` : reply });
}

/** Catalogue rows that are not things to pay for: the sign-off card and the videos. */
const NOT_FOR_SALE = (id: string) => id === "thankyou" || id.startsWith("watch_");
const CALL_ID = "founder";

/**
 * What happens after a cart, in the customer's own words:
 *
 *  · founder call in the cart → "pick a slot" button to the owner's calendar
 *    page (it shows his real free hours and makes the Meet itself). The slot
 *    booked comes back through the calendar bridge, which is where the ₹ link
 *    is issued — pay now or after the call.
 *  · anything else → the Store total for what they picked, as a Razorpay link,
 *    with the call offered as the alternative.
 *
 * Returns the text that went out (for the owner's Telegram copy), or "" when
 * nothing applied and the guide should answer as usual.
 */
async function handleCart(env: Env, cfg: WaConfig, m: Inbound, sid: string, lang: string): Promise<string> {
  const db = env.DB;
  const hi = lang === "hi";
  const ids = (m.order || []).map((o) => o.retailerId);
  const wantsCall = ids.includes(CALL_ID) || (ids.length > 0 && ids.every(NOT_FOR_SALE));
  const bookingUrl = (await getSetting(db, "booking_url")) || "";
  const say = async (text: string) => {
    await db.prepare(`INSERT INTO chat_messages (session_id, role, content, created_at) VALUES (?, 'guide', ?, datetime('now'))`).bind(sid, text.slice(0, 2000)).run();
  };

  if (wantsCall) {
    await db.prepare("UPDATE chat_sessions SET call_cart_at = datetime('now') WHERE id = ?").bind(sid).run();
    const existing = await upcomingBooking(db, m.from, null);
    if (existing) {
      const text = hi
        ? `आपकी कॉल पहले से ${existing.whenIst} IST पर तय है${existing.meetUrl ? ` — Meet लिंक: ${existing.meetUrl}` : ""}। दोबारा बुक करने की ज़रूरत नहीं; समय बदलना हो तो यहीं लिखिए।`
        : `Your call is already booked for ${existing.whenIst} IST${existing.meetUrl ? ` — Meet link: ${existing.meetUrl}` : ""}. No need to book again; if you want a different time, say so here.`;
      const r = await waSendText(cfg, m.from, text);
      if (r.ok) { await say(text); return text; }
    }
    const price = await callPriceInr(db);
    const amount = "₹" + price.toLocaleString("en-IN");
    if (!bookingUrl) return "";
    const text = hi
      ? `धन्यवाद! दुष्यंत के साथ 30 मिनट की Google Meet के लिए नीचे से अपना समय चुनिए — कैलेंडर में उनके खाली स्लॉट दिखेंगे। फ़ॉर्म में यही WhatsApp नंबर लिखिएगा।\n\nस्लॉट बुक होते ही ${amount} का पेमेंट लिंक यहीं और ईमेल पर आ जाएगा — अभी दें या मीटिंग के बाद, दोनों ठीक हैं।`
      : `Thank you! Pick a time for your 30-minute Google Meet with Dushyant below — the calendar shows his free slots. Please use this same WhatsApp number on the form.\n\nAs soon as the slot is booked, the ${amount} payment link comes here and on email — pay now or after the meeting, either is fine.`;
    const r = await waSendCtaUrl(cfg, m.from, text, hi ? "समय चुनें" : "Pick a slot", bookingUrl);
    if (!r.ok) {
      const t = await waSendText(cfg, m.from, `${text}\n${bookingUrl}`);
      if (!t.ok) return "";
    }
    await say(`${text}\n[+ button: ${bookingUrl}]`);
    return text + "\n[+ Pick a slot button]";
  }

  // Everything else: price it from the Store, never from the cart payload.
  const items: { name: string; total: number }[] = [];
  for (const o of m.order || []) {
    if (NOT_FOR_SALE(o.retailerId)) continue;
    const p = await db.prepare("SELECT name, price_inr FROM products WHERE retailer_id = ? AND tenant = 'goluq'").bind(o.retailerId).first<{ name: string; price_inr: number }>();
    if (!p || !(p.price_inr > 0)) continue;
    items.push({ name: p.name, total: p.price_inr * Math.max(1, o.qty) });
  }
  const total = items.reduce((s, i) => s + i.total, 0);
  if (!total) return "";
  const desc = items.map((i) => i.name).join(", ");
  const amount = "₹" + total.toLocaleString("en-IN");
  const intro = hi
    ? `धन्यवाद! आपने चुना: ${desc}। कुल ${amount}। पेमेंट लिंक यह रहा — अभी शुरू करने के लिए भुगतान कर दीजिए, या पहले दुष्यंत से बात करनी हो तो यहीं लिख दीजिए${bookingUrl ? " (या कैलेंडर से समय चुन लीजिए)" : ""}।`
    : `Thank you! You picked: ${desc}. Total ${amount}. Here is the payment link — pay now to get started, or reply here first if you would rather talk to Dushyant${bookingUrl ? " (or pick a slot on his calendar)" : ""}.`;
  const r = await issuePaymentLink(env, {
    kind: "cart", phone: m.from, name: m.name || null, amountInr: total, description: desc, lang, intro, by: "WhatsApp cart", country: countryFromPhone(m.from),
  });
  if (!r.ok) {
    console.log("cart link not issued:", r.error);
    return "";
  }
  if (bookingUrl) await waSendCtaUrl(cfg, m.from, hi ? "पहले बात करना चाहें तो:" : "If you would rather talk first:", hi ? "समय चुनें" : "Pick a slot", bookingUrl);
  return `${intro}\n[+ payment link ${amount}]`;
}

/** Ways people ask for the whole list, in the languages they write. */
const CATALOGUE_ASK = /\b(price\s*list|catalog(ue)?|rate\s*list|all\s+services|services\s+list|what\s+all\s+do\s+you\s+(do|offer))\b|कैटलॉग|रेट\s*लिस्ट|प्राइस\s*लिस्ट|सारी\s*सेवाएँ/i;

/** Catalogue ids the guide may show as cards — one per pricing row that sells on its own. */
const CARD_IDS = [
  "whatsappOffice", "whatsappStore",
  "tollfree", "virtualNumber", "waApi", "voiceCampaign", "txnSms", "promoSms", "missedCall",
  "automation", "whatsapp", "digitalEmployee", "website", "app", "offline", "platform",
  "dept_allinone", "dept_operations", "dept_crm", "dept_billing", "dept_inventory", "dept_hr", "dept_training", "dept_vendors", "dept_support", "dept_field", "dept_dashboard",
];

const CATALOGUE_SECTIONS = [
  { title: "Complete systems", ids: ["whatsappOffice", "whatsappStore"] },
  { title: "Communication", ids: ["tollfree", "virtualNumber", "waApi", "voiceCampaign", "txnSms", "promoSms", "missedCall"] },
  { title: "Software builds", ids: ["automation", "whatsapp", "digitalEmployee", "website", "app", "offline", "platform"] },
  { title: "By department", ids: ["dept_allinone", "dept_operations", "dept_crm", "dept_billing", "dept_inventory", "dept_hr", "dept_training", "dept_vendors", "dept_support", "dept_field", "dept_dashboard"] },
];

/** Cards already shown in this thread — a card repeated is a nag. */
async function cardsSent(db: D1Database, sid: string): Promise<string[]> {
  try {
    const row = await db.prepare("SELECT cards_sent FROM chat_sessions WHERE id = ?").bind(sid).first<{ cards_sent: string | null }>();
    const list = JSON.parse(row?.cards_sent || "[]");
    return Array.isArray(list) ? list.map(String) : [];
  } catch {
    return [];
  }
}
async function rememberCard(db: D1Database, sid: string, already: string[], card: string): Promise<void> {
  try {
    await db.prepare("UPDATE chat_sessions SET cards_sent = ? WHERE id = ?")
      .bind(JSON.stringify([...already, card]), sid).run();
  } catch (e) {
    console.log("cards_sent not saved:", String(e).slice(0, 120));
  }
}

/**
 * Tell the owner. Email for the events that were always emailed; Telegram for
 * the same event unless the caller is about to push a richer Telegram message
 * itself (the guide's reply is not known yet at the point email goes out).
 */
async function notifyOwner(
  env: Env,
  m: Inbound,
  why: string,
  opts: { telegram?: boolean; botOff?: boolean } = {}
): Promise<void> {
  if (opts.telegram !== false) await tgPush(env, m, sessionFor(m.from), { why, botOff: opts.botOff });
  const to = await getOwnerEmail(env.DB);
  if (!to || !mailEnabled(env)) return;
  const sent = await sendMail(env, {
    to,
    subject: `WhatsApp — ${why}${m.name ? ` (${m.name})` : ""}`,
    text:
      `${m.name || "Someone"} messaged the GoLuQ WhatsApp number.\n\n` +
      `From: +${m.from}\n` +
      `Message: ${m.text}\n\n` +
      `Reply on WhatsApp: https://wa.me/${m.from}\n` +
      `Or take over the thread in the cockpit: https://goluq.com/admin\n`,
  });
  // sendMail reports failure in its result rather than throwing — the same shape
  // that has silently swallowed two bugs in this codebase already.
  if (!sent.ok) console.log("wa owner alert not sent:", sent.error);
}

/**
 * Every inbound WhatsApp message, on the owner's phone, with what the guide
 * answered — and buttons to take the thread over or hand it back. Replying to
 * the Telegram message replies to the customer (see api/tg/webhook.ts).
 */
async function tgPush(
  env: Env,
  m: Inbound,
  sid: string,
  o: { why?: string; reply?: string; note?: string; botOff?: boolean; buttons?: boolean }
): Promise<void> {
  const head = `💬 <b>WhatsApp</b> · ${tgEscape(m.name || "Unknown")} · +${tgEscape(m.from)}`;
  const lines = [head];
  if (o.why) lines.push(`🔔 ${tgEscape(o.why)}`);
  lines.push("", `<i>${tgEscape(m.text.slice(0, 1200))}</i>`);
  if (o.reply) lines.push("", `↩︎ <b>Guide:</b> ${tgEscape(o.reply.slice(0, 1200))}`);
  if (o.note) lines.push("", `⚠️ ${tgEscape(o.note)}`);
  lines.push("", "<i>Reply to this message to answer them.</i>");

  const buttons: TgButton[][] | undefined =
    o.buttons === false
      ? undefined
      : [[
          o.botOff
            ? { text: "▶️ Guide on", data: `chat:on:${sid}` }
            : { text: "✋ Guide off", data: `chat:off:${sid}` },
          { text: "✔️ Close", data: `chat:close:${sid}` },
          { text: "Open WhatsApp", url: `https://wa.me/${m.from}` },
        ]];
  await tgAlertOwner(env.DB, env, lines.join("\n"), { buttons, kind: "chat", ref: sid });
}

/**
 * Apply Meta's delivery receipts to campaign recipients.
 *
 * Statuses only ever move forward — sent → delivered → read. A late "delivered"
 * arriving after a "read" must not walk the record backwards, which is why the
 * update is guarded by the current status rather than applied blindly.
 */
async function recordStatuses(db: D1Database, body: any): Promise<void> {
  const RANK: Record<string, number> = { pending: 0, sent: 1, delivered: 2, read: 3, replied: 4 };
  try {
    for (const entry of body?.entry || []) {
      for (const change of entry?.changes || []) {
        for (const st of change?.value?.statuses || []) {
          const id = String(st?.id || "");
          const raw = String(st?.status || "");
          if (!id) continue;
          const next = raw === "failed" ? "failed" : RANK[raw] ? raw : "";
          if (!next) continue;

          const row = await db
            .prepare("SELECT id, campaign_id, status FROM campaign_targets WHERE wamid = ?")
            .bind(id)
            .first<{ id: number; campaign_id: number; status: string }>();
          if (!row) continue;
          if (next !== "failed" && (RANK[next] ?? 0) <= (RANK[row.status] ?? 0)) continue;

          await db
            .prepare("UPDATE campaign_targets SET status = ? WHERE id = ?")
            .bind(next, row.id)
            .run();

          const col = next === "delivered" ? "delivered" : next === "read" ? "read_count" : "";
          if (col) {
            await db
              .prepare(`UPDATE campaigns SET ${col} = ${col} + 1 WHERE id = ?`)
              .bind(row.campaign_id)
              .run();
          }
        }
      }
    }
  } catch (e) {
    // Metrics must never cost us a real customer message.
    console.log("status receipt failed:", String(e).slice(0, 200));
  }
}

/** Someone replying to a campaign is the outcome that matters — record it. */
async function markReplied(db: D1Database, phone: string): Promise<void> {
  try {
    const row = await db
      .prepare(
        `SELECT id, campaign_id FROM campaign_targets
          WHERE phone = ? AND status IN ('sent','delivered','read')
          ORDER BY id DESC LIMIT 1`
      )
      .bind(phone)
      .first<{ id: number; campaign_id: number }>();
    if (!row) return;
    await db.prepare("UPDATE campaign_targets SET status = 'replied' WHERE id = ?").bind(row.id).run();
    await db.prepare("UPDATE campaigns SET replied = replied + 1 WHERE id = ?").bind(row.campaign_id).run();
  } catch {
    /* never block a customer message over bookkeeping */
  }
}
