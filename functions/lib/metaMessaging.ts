/// <reference types="@cloudflare/workers-types" />

import { conciergeReply, type ConciergeEnv, type ConciergeMsg } from "./concierge";
import { getSetting } from "./settings";
import { tgAlertOwner, tgEscape, type TgButton, type TgEnv } from "./telegram";

/**
 * Facebook Messenger and Instagram Direct, in the same inbox as WhatsApp,
 * Telegram and the website.
 *
 * Both arrive on the Meta webhook we already verify for WhatsApp (same app,
 * same app secret), as `object: "page"` (Messenger) or `object: "instagram"`
 * with `entry[].messaging[]`. A thread is stored as `fb:<psid>` or
 * `ig:<igsid>` in chat_sessions, so the cockpit, the Telegram buttons and
 * sendAgentReply need nothing new beyond the prefix. Replies go out through
 * the Page access token the owner connected under Publish (the same token
 * that posts); Instagram messaging rides the Page too, via /me/messages.
 *
 * Nothing here runs until the owner's Meta app has the Pages use case with
 * pages_messaging and instagram_manage_messages, and the webhook is
 * subscribed to `messages` for both objects (docs/OWNER-TASKS.md).
 */
export interface MetaMsgEnv extends ConciergeEnv, TgEnv {
  DB: D1Database;
}

export type MetaChannel = "fb" | "ig";

interface InboundDm {
  channel: MetaChannel;
  mid: string;
  from: string;
  text: string;
  pageId: string;
}

export const isMetaDm = (sessionId: string): boolean => sessionId.startsWith("fb:") || sessionId.startsWith("ig:");

/** Text messages only; echoes of our own sends, reads and deliveries are skipped. */
export function parseMetaDms(body: any): InboundDm[] {
  const channel: MetaChannel | null = body?.object === "page" ? "fb" : body?.object === "instagram" ? "ig" : null;
  if (!channel) return [];
  const out: InboundDm[] = [];
  for (const entry of body?.entry || []) {
    for (const ev of entry?.messaging || []) {
      const m = ev?.message;
      if (!m || m.is_echo) continue;
      const from = String(ev?.sender?.id || "");
      const mid = String(m.mid || "");
      if (!from || !mid) continue;
      // Attachments arrive without text; the guide still needs something to answer.
      const text = String(m.text || "").trim() || (Array.isArray(m.attachments) && m.attachments.length ? `[${m.attachments[0]?.type || "attachment"}]` : "");
      if (!text) continue;
      out.push({ channel, mid, from, text: text.slice(0, 4000), pageId: String(entry?.id || "") });
    }
  }
  return out;
}

async function pageToken(db: D1Database): Promise<string> {
  return (await getSetting(db, "fb_page_token")) || "";
}

/** Send a text to a Messenger or Instagram user as the Page. */
export async function metaDmSend(db: D1Database, sessionId: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const token = await pageToken(db);
  if (!token) return { ok: false, error: "The Facebook Page is not connected (Publish → Connect)." };
  const to = sessionId.slice(3);
  const body = { recipient: { id: to }, messaging_type: "RESPONSE", message: { text: text.slice(0, 2000) } };
  try {
    const r = await fetch("https://graph.facebook.com/v21.0/me/messages", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const j: any = await r.json().catch(() => ({}));
    if (!r.ok || j?.error) return { ok: false, error: String(j?.error?.message || r.status) };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e).slice(0, 200) };
  }
}

/** The person's name from the Graph API, once per new thread; blank if the scope is missing. */
async function nameOf(db: D1Database, channel: MetaChannel, id: string): Promise<string> {
  const token = await pageToken(db);
  if (!token) return "";
  try {
    const fields = channel === "fb" ? "first_name,last_name" : "name,username";
    const r = await fetch(`https://graph.facebook.com/v21.0/${id}?fields=${fields}&access_token=${encodeURIComponent(token)}`);
    const j: any = await r.json().catch(() => ({}));
    if (channel === "fb") return [j?.first_name, j?.last_name].filter(Boolean).join(" ");
    return String(j?.name || j?.username || "");
  } catch {
    return "";
  }
}

/** Handle one webhook body of Messenger or Instagram events. */
export async function handleMetaDms(env: MetaMsgEnv, body: any): Promise<number> {
  const dms = parseMetaDms(body);
  for (const dm of dms) {
    try {
      await handleOne(env, dm);
    } catch (e) {
      console.log("meta dm failed:", String(e).slice(0, 300));
    }
  }
  return dms.length;
}

async function handleOne(env: MetaMsgEnv, dm: InboundDm): Promise<void> {
  const db = env.DB;
  const sid = `${dm.channel}:${dm.from}`;
  // Meta retries a delivery it did not get a 200 for; the same mid must not
  // become two messages. Same ledger the WhatsApp hook uses.
  const seen = await db.prepare("INSERT OR IGNORE INTO wa_events (id, created_at) VALUES (?, datetime('now'))").bind(`${dm.channel}:${dm.mid}`).run();
  if ((seen as any)?.meta?.changes === 0) return;

  const prior = await db.prepare("SELECT lang, closed, bot_off, visitor_name FROM chat_sessions WHERE id = ?").bind(sid)
    .first<{ lang: string | null; closed: number; bot_off: number; visitor_name: string | null }>();
  const isNew = !prior;
  const lang = /[ऀ-ॿ]/.test(dm.text) ? "hi" : prior?.lang === "hi" && !/[a-zA-Z]{4,}/.test(dm.text) ? "hi" : "en";
  const name = prior?.visitor_name || (await nameOf(db, dm.channel, dm.from));
  const page = dm.channel === "fb" ? "facebook" : "instagram";

  await db.prepare(
    `INSERT INTO chat_sessions (id, created_at, last_at, page, lang, visitor_name)
     VALUES (?, datetime('now'), datetime('now'), ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET last_at = datetime('now'), lang = excluded.lang, unread_for_agent = unread_for_agent + 1,
       closed = 0, visitor_name = COALESCE(chat_sessions.visitor_name, excluded.visitor_name)`
  ).bind(sid, page, lang, name || null).run();
  await db.prepare(`INSERT INTO chat_messages (session_id, role, content, created_at) VALUES (?, 'visitor', ?, datetime('now'))`).bind(sid, dm.text).run();

  const label = dm.channel === "fb" ? "Messenger" : "Instagram";
  if (isNew) {
    await tgAlertOwner(db, env, [
      `${dm.channel === "fb" ? "📘" : "📸"} <b>New ${label} conversation</b> · ${tgEscape(name || dm.from)}`,
      `<i>${tgEscape(dm.text.slice(0, 400))}</i>`,
    ].join("\n"), { buttons: ownerButtons(sid), kind: "chat", ref: sid });
  } else if (prior?.bot_off) {
    await tgAlertOwner(db, env, [
      `${dm.channel === "fb" ? "📘" : "📸"} <b>${tgEscape(name || dm.from)}</b> (${label}, guide off)`,
      `<i>${tgEscape(dm.text.slice(0, 400))}</i>`,
    ].join("\n"), { buttons: ownerButtons(sid), kind: "chat", ref: sid });
    return;
  }
  if (prior?.bot_off) return;

  const history = await db.prepare("SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY id DESC LIMIT 10").bind(sid).all<{ role: string; content: string }>();
  const msgs: ConciergeMsg[] = (history.results || []).reverse().map((r) => ({ role: r.role === "visitor" ? "user" : "assistant", content: r.content }));
  const bookingUrl = (await getSetting(db, "booking_url")) || "";
  const reply = await conciergeReply(env, {
    messages: msgs,
    lang,
    context:
      `\nThe customer is messaging the GoLuQ business page on ${label.toUpperCase()}. Keep replies SHORT — two or three lines, the way people message. ` +
      "You cannot show product cards here; describe the product in words and, when they are ready, give ONE of these next steps: the written plan at https://goluq.com/start" +
      (bookingUrl ? ` or a 30-minute call at ${bookingUrl}` : "") +
      ", or WhatsApp +91 83495 04400 for cards and a catalogue.",
  });
  const sent = await metaDmSend(db, sid, reply);
  if (sent.ok) {
    await db.prepare(`INSERT INTO chat_messages (session_id, role, content, created_at) VALUES (?, 'guide', ?, datetime('now'))`).bind(sid, reply.slice(0, 2000)).run();
  } else {
    console.log("meta dm reply not sent:", sent.error);
  }
}

function ownerButtons(sid: string): TgButton[][] {
  return [[
    { text: "✍️ Reply", data: `chat:reply:${sid}` },
    { text: "✋ Guide off", data: `chat:off:${sid}` },
    { text: "✔️ Close", data: `chat:close:${sid}` },
  ]];
}
