/// <reference types="@cloudflare/workers-types" />

import { conciergeReply, type ConciergeEnv, type ConciergeMsg } from "../../lib/concierge";
import { getSetting } from "../../lib/settings";
import { tgAlertOwner, tgEscape, type TgEnv } from "../../lib/telegram";
import { publicBot, publicSend } from "../../lib/tgPublic";

interface Env extends ConciergeEnv, TgEnv {
  DB: D1Database;
}

/**
 * The customer-facing Telegram bot — the same guide that answers on the
 * website and on WhatsApp, for the markets that live on Telegram (CIS, Iran,
 * and anyone who prefers it). Separate bot, separate token, separate
 * webhook from the owner's cockpit bot, which stays private.
 *
 * Threads are stored as `tg:<chat_id>` beside the others, so the cockpit
 * shows them and a reply from the cockpit or from the owner's bot reaches
 * the customer through this bot (see lib/agentReply).
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const bot = await publicBot(env.DB);
  if (!bot.token) return new Response("ok");
  if (bot.secret && request.headers.get("x-telegram-bot-api-secret-token") !== bot.secret) {
    return new Response("forbidden", { status: 403 });
  }
  let u: any = {};
  try { u = await request.json(); } catch { return new Response("ok"); }
  const msg = u?.message;
  const chatId = String(msg?.chat?.id || "");
  const text = String(msg?.text || "").trim();
  if (!chatId || !text) return new Response("ok");

  const db = env.DB;
  const sid = `tg:${chatId}`;
  const name = [msg?.from?.first_name, msg?.from?.last_name].filter(Boolean).join(" ").slice(0, 120);
  const prior = await db.prepare("SELECT lang, closed, bot_off FROM chat_sessions WHERE id = ?").bind(sid).first<{ lang: string | null; closed: number; bot_off: number }>();
  const isNew = !prior;
  const lang = /[ऀ-ॿ]/.test(text) ? "hi" : prior?.lang === "hi" && !/[a-zA-Z]{4,}/.test(text) ? "hi" : "en";
  const script = /[Ѐ-ӿ]/.test(text) ? "Russian (Cyrillic)" : /[؀-ۿ]/.test(text) ? "Arabic or Persian" : "";

  await db.prepare(
    `INSERT INTO chat_sessions (id, created_at, last_at, page, lang, visitor_name)
     VALUES (?, datetime('now'), datetime('now'), 'telegram', ?, ?)
     ON CONFLICT(id) DO UPDATE SET last_at = datetime('now'), lang = excluded.lang, unread_for_agent = unread_for_agent + 1,
       visitor_name = COALESCE(NULLIF(chat_sessions.visitor_name, ''), excluded.visitor_name)`
  ).bind(sid, lang, name || null).run();
  await db.prepare(`INSERT INTO chat_messages (session_id, role, content, created_at) VALUES (?, 'visitor', ?, datetime('now'))`).bind(sid, text.slice(0, 2000)).run();

  if (prior?.closed || prior?.bot_off) {
    if (prior?.bot_off) await tgAlertOwner(db, env, `✈️ <b>Telegram</b> · ${tgEscape(name || chatId)} (you are handling this)\n<i>${tgEscape(text.slice(0, 500))}</i>`, { kind: "chat", ref: sid }).catch(() => {});
    return new Response("ok");
  }

  if (text === "/start") {
    const hello = lang === "hi"
      ? "नमस्ते! मैं GoLuQ.com की गाइड हूँ। बताइए आपका बिज़नेस क्या है और क्या अटकता है — सॉफ़्टवेयर, WhatsApp, कॉल या टोल-फ़्री लाइन — मैं सही चीज़ और कीमत बताऊँगी।"
      : "Hello! This is the GoLuQ.com guide. Tell me what business you run and what slows it down — software, WhatsApp, calls or a toll-free line — and I will point you to the right thing and its price. You can also write in your own language.";
    await publicSend(bot, chatId, hello);
    await db.prepare(`INSERT INTO chat_messages (session_id, role, content, created_at) VALUES (?, 'guide', ?, datetime('now'))`).bind(sid, hello).run();
    return new Response("ok");
  }

  const history = await db.prepare("SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY id DESC LIMIT 10").bind(sid).all<{ role: string; content: string }>();
  const msgs: ConciergeMsg[] = (history.results || []).reverse().map((r) => ({ role: r.role === "visitor" ? "user" : "assistant", content: r.content }));
  const bookingUrl = (await getSetting(db, "booking_url")) || "";
  const reply = await conciergeReply(env, {
    messages: msgs,
    lang,
    country: msg?.from?.language_code === "ru" ? "RU" : msg?.from?.language_code === "fa" ? "IR" : "",
    context:
      "\nThe customer is messaging the GoLuQ business bot on TELEGRAM. Keep replies SHORT — two or three lines. " +
      (script ? `THE CUSTOMER WRITES IN ${script}: reply in that same language, naturally. ` : "If the customer writes in a language other than English or Hindi, reply in their language. ") +
      "You cannot show product cards here; describe the product in words and, when they are ready, give ONE of these next steps: the written plan at https://goluq.com/start" +
      (bookingUrl ? ` or a 30-minute call at ${bookingUrl}` : "") +
      ". Telegram customers are often outside India: quote in their currency as listed, and mention WhatsApp Store works with Telegram for markets where WhatsApp is restricted.",
  });
  const sent = await publicSend(bot, chatId, reply);
  if (sent.ok) {
    await db.prepare(`INSERT INTO chat_messages (session_id, role, content, created_at) VALUES (?, 'guide', ?, datetime('now'))`).bind(sid, reply.slice(0, 2000)).run();
  }
  if (isNew) {
    await tgAlertOwner(db, env, [
      `✈️ <b>New Telegram conversation</b> · ${tgEscape(name || chatId)}${msg?.from?.username ? ` (@${tgEscape(msg.from.username)})` : ""}`,
      `<i>${tgEscape(text.slice(0, 400))}</i>`,
      "",
      `<b>Guide:</b> ${tgEscape(reply.slice(0, 400))}`,
      "",
      "Reply to this message to answer them yourself.",
    ].join("\n"), { kind: "chat", ref: sid, buttons: [[{ text: "Guide off", data: `chat:off:${sid}` }, { text: "Close", data: `chat:close:${sid}` }]] }).catch(() => {});
  }
  return new Response("ok");
};
