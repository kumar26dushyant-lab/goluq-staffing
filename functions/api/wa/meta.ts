/// <reference types="@cloudflare/workers-types" />

import { conciergeReply, type ConciergeEnv, type ConciergeMsg } from "../../lib/concierge";
import { classifyReply } from "../../lib/gemini";
import { sendMail, mailEnabled, type MailEnv } from "../../lib/mailer";
import { getOwnerEmail } from "../../lib/settings";
import {
  waConfig, waReady, waSendText, waMarkRead, waVerifySignature, type WaEnv, type WaConfig,
} from "../../lib/whatsapp";

interface Env extends ConciergeEnv, WaEnv, MailEnv {
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
        const text =
          m?.text?.body ||
          m?.button?.text ||
          m?.interactive?.button_reply?.title ||
          m?.interactive?.list_reply?.title ||
          "";
        if (!m?.id || !m?.from) continue;
        out.push({ id: m.id, from: String(m.from), text: String(text), name: nameOf(m.from) });
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

  // Someone asking to be left alone is asking once. Honour it, confirm it, and
  // never let the guide speak to them again.
  if ((await classifyReply(env, m.text)) === "stop") {
    await db.prepare("UPDATE chat_sessions SET closed = 1 WHERE id = ?").bind(sid).run();
    await waSendText(
      cfg,
      m.from,
      lang === "hi"
        ? "ठीक है, अब आपको हमारी ओर से कोई संदेश नहीं आएगा। ज़रूरत हो तो कभी भी लिख दीजिए।"
        : "Done — you won't hear from us again. Message any time if you need us."
    );
    return;
  }

  if (prior?.closed) return;

  // The owner has switched the guide off for this person, deliberately.
  if (prior?.bot_off) {
    await notifyOwner(env, m, "message on a thread you are handling");
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
    await notifyOwner(env, m, "asked to speak to a person");
  }

  const history = await db
    .prepare("SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY id DESC LIMIT 10")
    .bind(sid)
    .all<{ role: string; content: string }>();

  const msgs: ConciergeMsg[] = (history.results || [])
    .reverse()
    .map((r) => ({ role: r.role === "visitor" ? "user" : "assistant", content: r.content }));

  const reply = await conciergeReply(env, {
    messages: msgs,
    lang,
    country: countryFromPhone(m.from),
    context:
      "\nThe customer is messaging the GoLuQ business number on WhatsApp, so keep replies SHORT — two or three lines, the way people actually message. " +
      "They came to us, which means they already have something in mind: find out what business they run and what they need, then name a price. " +
      "You cannot show them a demo here, so close on either a quote or a call from a real person." +
      (wantsHuman
        ? " THEY HAVE ASKED TO SPEAK TO A PERSON. Say plainly that Dushyant has been told and will reply here himself shortly. Do not argue or try to handle it yourself — but do ask what they need, so he has it in front of him when he arrives."
        : ""),
  });

  const sent = await waSendText(cfg, m.from, reply);
  if (!sent.ok) {
    // Almost always the 24-hour window: free-form text is only deliverable
    // within 24h of the customer's last message. Nothing here is retryable.
    console.log("wa reply not delivered:", sent.error);
    return;
  }

  await db
    .prepare(
      `INSERT INTO chat_messages (session_id, role, content, created_at)
       VALUES (?, 'guide', ?, datetime('now'))`
    )
    .bind(sid, reply.slice(0, 2000))
    .run();

  if (isNew) await notifyOwner(env, m, "new WhatsApp conversation");
}

/** Tell the owner by email; a WhatsApp lead is worth interrupting someone for. */
async function notifyOwner(env: Env, m: Inbound, why: string): Promise<void> {
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
