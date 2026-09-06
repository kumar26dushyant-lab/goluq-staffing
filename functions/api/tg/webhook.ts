/// <reference types="@cloudflare/workers-types" />

import { sendAgentReply } from "../../lib/agentReply";
import {
  tgAnswerCallback, tgConfig, tgEscape, tgOutboxLookup, tgReady, tgSend, tgSetButtons, tgTryPair,
  type TgConfig, type TgEnv,
} from "../../lib/telegram";
import type { WaEnv } from "../../lib/whatsapp";

interface Env extends TgEnv, WaEnv {
  DB: D1Database;
}

/**
 * Updates from Telegram — the owner talking back to the cockpit.
 *
 *   reply to an alert      → that text goes to the customer the alert was about
 *   button under an alert  → Book / Park / Drop a lead; Guide off / on / Close a chat
 *   /pair 123456           → claim this chat as the owner's (code from the cockpit)
 *   /help /leads /waiting  → small read-only commands
 *
 * Every path returns 200. Telegram retries a failed delivery for a day and the
 * same update would then be processed over and over.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const cfg = await tgConfig(env.DB, env);
  if (!tgReady(cfg)) return new Response("ok");

  // Telegram sends the secret we registered with setWebhook in this header. An
  // update without it did not come from Telegram, and gets nothing.
  const given = request.headers.get("x-telegram-bot-api-secret-token") || "";
  if (!cfg.secret || given !== cfg.secret) return new Response("forbidden", { status: 403 });

  let u: any = {};
  try {
    u = await request.json();
  } catch {
    return new Response("ok");
  }

  try {
    if (u?.callback_query) await onButton(env, cfg, u.callback_query);
    else if (u?.message) await onMessage(env, cfg, u.message);
  } catch (e) {
    console.log("tg update failed:", String(e).slice(0, 300));
  }
  return new Response("ok");
};

const isOwner = (cfg: TgConfig, chatId: unknown) => !!cfg.chatId && String(chatId) === cfg.chatId;

async function onMessage(env: Env, cfg: TgConfig, msg: any): Promise<void> {
  const chatId = String(msg?.chat?.id || "");
  const text = String(msg?.text || "").trim();
  if (!chatId || !text) return;

  // ── Pairing ──────────────────────────────────────────────────────────────
  // "/start 123456" is what the deep link from the cockpit sends; a bare code
  // typed by hand works too.
  const pair = text.match(/^(?:\/start|\/pair)?\s*(\d{6})$/);
  if (pair) {
    if (await tgTryPair(env.DB, pair[1], chatId)) {
      const c2 = { ...cfg, chatId };
      await tgSend(
        c2,
        chatId,
        "✅ <b>Paired.</b> This chat is now the GoLuQ cockpit.\n\n" +
          "You will get every enquiry and every customer message here. " +
          "To answer someone, <b>reply</b> to their alert. Send /help for the rest."
      );
    } else {
      await tgSend(cfg, chatId, "That code is wrong or has expired. Open the cockpit → Settings → Telegram and press <b>Connect</b> for a fresh one.");
    }
    return;
  }

  if (!isOwner(cfg, chatId)) {
    // A stranger. Say so once for /start; ignore everything else.
    if (/^\/start/.test(text)) await tgSend(cfg, chatId, "This bot is private to GoLuQ.");
    return;
  }

  // ── Owner replying to an alert ───────────────────────────────────────────
  const replyToId = Number(msg?.reply_to_message?.message_id || 0);
  if (replyToId) {
    const about = await tgOutboxLookup(env.DB, replyToId);
    if (!about) {
      await tgSend(cfg, chatId, "I don't know who that message was about — it may be older than the cockpit's memory. Reply from goluq.com/admin instead.", { replyTo: msg.message_id });
      return;
    }

    // Slash commands in a reply act on that conversation.
    if (about.kind === "chat" && /^\/(off|on|close)\b/i.test(text)) {
      const cmd = text.slice(1).toLowerCase().split(/\s/)[0];
      await chatAction(env, about.ref, cmd);
      await tgSend(cfg, chatId, cmd === "close" ? "Conversation closed." : `Guide switched ${cmd} for this conversation.`, { replyTo: msg.message_id });
      return;
    }

    const sessionId = about.kind === "chat" ? about.ref : await sessionForLead(env.DB, about.ref);
    if (!sessionId) {
      await tgSend(cfg, chatId, "That lead has no phone number I can message.", { replyTo: msg.message_id });
      return;
    }
    const r = await sendAgentReply(env, env.DB, sessionId, text);
    await tgSend(
      cfg,
      chatId,
      r.ok ? "✅ Sent." : `❌ Not sent. ${tgEscape(r.error)}`,
      { replyTo: msg.message_id }
    );
    // The guide stays quiet for a while after a person replies (see wa/meta.ts),
    // so nothing else to do here.
    return;
  }

  // ── Commands ─────────────────────────────────────────────────────────────
  const cmd = text.toLowerCase().split(/\s/)[0];
  if (cmd === "/help" || cmd === "/start") {
    await tgSend(
      cfg,
      chatId,
      "<b>GoLuQ cockpit</b>\n\n" +
        "• <b>Reply</b> to any alert → your text goes to that person (WhatsApp or website chat).\n" +
        "• Reply <code>/off</code> → guide stops answering that person; <code>/on</code> hands back; <code>/close</code> ends it.\n" +
        "• Buttons under a lead: <b>Book</b> (you will call), <b>Park</b> (follow up in a week), <b>Drop</b>.\n" +
        "• /leads — last five enquiries\n" +
        "• /waiting — who is waiting for a person right now\n\n" +
        "Everything else: https://goluq.com/admin"
    );
    return;
  }
  if (cmd === "/leads") {
    const rows = await env.DB.prepare(
      `SELECT id, name, phone, industry, status, created_at FROM leads ORDER BY id DESC LIMIT 5`
    ).all<{ id: number; name: string; phone: string; industry: string | null; status: string; created_at: string }>();
    const list = (rows.results ?? []).map(
      (l) => `• <b>${tgEscape(l.name)}</b> · ${tgEscape(l.industry || "—")} · ${tgEscape(l.status)}\n  +${tgEscape(l.phone)} · ${l.created_at.slice(0, 10)}`
    );
    await tgSend(cfg, chatId, list.length ? `<b>Last enquiries</b>\n\n${list.join("\n")}` : "No enquiries yet.");
    return;
  }
  if (cmd === "/waiting") {
    const rows = await env.DB.prepare(
      `SELECT id, visitor_name, visitor_phone, last_at FROM chat_sessions
        WHERE needs_human = 1 AND closed = 0 ORDER BY last_at DESC LIMIT 10`
    ).all<{ id: string; visitor_name: string | null; visitor_phone: string | null; last_at: string }>();
    const list = (rows.results ?? []).map(
      (s) => `• ${tgEscape(s.visitor_name || s.visitor_phone || s.id)} · ${s.last_at.slice(0, 16)}`
    );
    await tgSend(cfg, chatId, list.length ? `<b>Waiting for a person</b>\n\n${list.join("\n")}\n\nOpen goluq.com/admin → Live chat.` : "Nobody is waiting. 👍");
    return;
  }

  await tgSend(cfg, chatId, "To answer someone, reply to their alert. /help lists the commands.", { replyTo: msg.message_id });
}

/** A lead is messaged on WhatsApp; the thread is keyed by their number. */
async function sessionForLead(db: D1Database, leadId: string): Promise<string> {
  const l = await db.prepare(`SELECT phone FROM leads WHERE id = ?`).bind(Number(leadId)).first<{ phone: string }>();
  const digits = String(l?.phone || "").replace(/\D/g, "");
  if (!digits) return "";
  return `wa:${digits.length === 10 ? "91" + digits : digits}`;
}

async function chatAction(env: Env, sessionId: string, cmd: string): Promise<void> {
  if (cmd === "off" || cmd === "on") {
    await env.DB.prepare("UPDATE chat_sessions SET bot_off = ? WHERE id = ?").bind(cmd === "off" ? 1 : 0, sessionId).run();
  } else if (cmd === "close") {
    await env.DB.prepare("UPDATE chat_sessions SET closed = 1, needs_human = 0 WHERE id = ?").bind(sessionId).run();
  }
}

/**
 * Inline buttons. `data` is "<kind>:<action>:<ref>". After acting, the buttons
 * are replaced with a single label saying what was chosen, so the alert reads
 * as a record rather than an open question.
 */
async function onButton(env: Env, cfg: TgConfig, q: any): Promise<void> {
  const chatId = String(q?.message?.chat?.id || "");
  const messageId = Number(q?.message?.message_id || 0);
  const [kind, action, ref] = String(q?.data || "").split(":");
  if (!isOwner(cfg, chatId)) {
    await tgAnswerCallback(cfg, q.id, "Not yours.");
    return;
  }

  let done = "";
  if (kind === "lead") {
    const id = Number(ref);
    if (action === "book") {
      await env.DB.prepare("UPDATE leads SET status = 'engaged', next_followup_at = NULL WHERE id = ?").bind(id).run();
      done = "📞 Booked — you will call them";
    } else if (action === "park") {
      await env.DB.prepare(
        "UPDATE leads SET next_followup_at = datetime('now', '+7 days') WHERE id = ? AND opted_out = 0"
      ).bind(id).run();
      done = "⏸ Parked — follow-up in 7 days";
    } else if (action === "drop") {
      await env.DB.prepare("UPDATE leads SET status = 'done', next_followup_at = NULL WHERE id = ?").bind(id).run();
      done = "🗑 Dropped";
    }
  } else if (kind === "chat" && ref) {
    await chatAction(env, ref, action);
    done = action === "close" ? "Closed" : action === "off" ? "Guide off — you are handling this" : "Guide back on";
  }

  await tgAnswerCallback(cfg, q.id, done || "Nothing to do.");
  if (done && messageId) await tgSetButtons(cfg, chatId, messageId, [[{ text: `✓ ${done}`, data: "noop" }]]);
}
