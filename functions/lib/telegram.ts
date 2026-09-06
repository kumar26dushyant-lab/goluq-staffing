/// <reference types="@cloudflare/workers-types" />

import { getSetting, setSetting } from "./settings";

/**
 * The owner's Telegram — the cockpit in a pocket.
 *
 * Email alerts arrive in a tab nobody watches on a Sunday. Telegram arrives on
 * the phone, and the owner can answer the customer by simply replying to the
 * alert. This is the "how do I know someone is talking to me" channel; the web
 * cockpit stays the place for everything that needs a screen.
 *
 * One bot, one owner. The bot is paired to exactly one chat id by a short code
 * generated in the cockpit; every other person who finds the bot is ignored.
 *
 * The token comes from the environment or the cockpit, like the WhatsApp
 * credentials; it is written from the cockpit and never read back.
 */
export interface TgEnv {
  TELEGRAM_BOT_TOKEN?: string;
}

export interface TgConfig {
  token: string;
  /** The owner's chat id, "" until paired. */
  chatId: string;
  /** Random string Telegram echoes in a header so we know a webhook is really from them. */
  secret: string;
  username: string;
}

/** The address Telegram delivers webhooks to. Not derived from the request: behind nginx that is 127.0.0.1. */
export const TG_WEBHOOK_URL = "https://goluq.com/api/tg/webhook";

const API = "https://api.telegram.org";

export async function tgConfig(db: D1Database, env: TgEnv): Promise<TgConfig> {
  const s = async (k: string) => (await getSetting(db, k)) || "";
  return {
    token: env.TELEGRAM_BOT_TOKEN || (await s("tg_bot_token")),
    chatId: await s("tg_owner_chat_id"),
    secret: await s("tg_webhook_secret"),
    username: await s("tg_bot_username"),
  };
}

export const tgReady = (c: TgConfig): boolean => !!c.token;
export const tgPaired = (c: TgConfig): boolean => !!c.token && !!c.chatId;

/** Explicit result — callers must read `ok`. Same rule as the WhatsApp client. */
export type TgResult = { ok: true; messageId: number } | { ok: false; error: string };

/** One inline keyboard button. `data` comes back verbatim in the callback. */
export interface TgButton {
  text: string;
  data?: string;
  url?: string;
}

export function tgEscape(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function call(c: TgConfig, method: string, payload: Record<string, unknown>): Promise<{ ok: boolean; result?: any; error?: string }> {
  if (!c.token) return { ok: false, error: "telegram_not_configured" };
  try {
    const res = await fetch(`${API}/bot${c.token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j: any = await res.json().catch(() => ({}));
    if (!res.ok || !j?.ok) return { ok: false, error: String(j?.description || `http_${res.status}`).slice(0, 200) };
    return { ok: true, result: j.result };
  } catch (e) {
    return { ok: false, error: String(e).slice(0, 200) };
  }
}

/**
 * Send HTML-formatted text. Telegram's HTML is a small subset — <b>, <i>,
 * <code>, <a> — and everything user-supplied must go through tgEscape first.
 */
export async function tgSend(
  c: TgConfig,
  chatId: string,
  html: string,
  opts: { buttons?: TgButton[][]; replyTo?: number } = {}
): Promise<TgResult> {
  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text: html.slice(0, 4000),
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };
  if (opts.buttons?.length) {
    payload.reply_markup = {
      inline_keyboard: opts.buttons.map((row) =>
        row.map((b) => (b.url ? { text: b.text, url: b.url } : { text: b.text, callback_data: (b.data || "noop").slice(0, 64) }))
      ),
    };
  }
  if (opts.replyTo) payload.reply_to_message_id = opts.replyTo;
  const r = await call(c, "sendMessage", payload);
  if (!r.ok) return { ok: false, error: r.error || "send_failed" };
  return { ok: true, messageId: Number(r.result?.message_id || 0) };
}

/** Acknowledge a button press; `text` shows as a small toast on the owner's phone. */
export async function tgAnswerCallback(c: TgConfig, callbackId: string, text = ""): Promise<void> {
  await call(c, "answerCallbackQuery", { callback_query_id: callbackId, text: text.slice(0, 200) });
}

/** Swap the buttons under a message — used to replace them with what was chosen. */
export async function tgSetButtons(c: TgConfig, chatId: string, messageId: number, buttons: TgButton[][]): Promise<void> {
  await call(c, "editMessageReplyMarkup", {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: {
      inline_keyboard: buttons.map((row) =>
        row.map((b) => (b.url ? { text: b.text, url: b.url } : { text: b.text, callback_data: (b.data || "noop").slice(0, 64) }))
      ),
    },
  });
}

export async function tgGetMe(c: TgConfig): Promise<{ ok: boolean; username?: string; error?: string }> {
  const r = await call(c, "getMe", {});
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, username: String(r.result?.username || "") };
}

export async function tgSetWebhook(c: TgConfig, url: string, secret: string): Promise<{ ok: boolean; error?: string }> {
  const r = await call(c, "setWebhook", {
    url,
    secret_token: secret,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

export async function tgWebhookInfo(c: TgConfig): Promise<{ ok: boolean; url?: string; lastError?: string; pending?: number; error?: string }> {
  const r = await call(c, "getWebhookInfo", {});
  if (!r.ok) return { ok: false, error: r.error };
  return {
    ok: true,
    url: String(r.result?.url || ""),
    lastError: r.result?.last_error_message ? String(r.result.last_error_message) : "",
    pending: Number(r.result?.pending_update_count || 0),
  };
}

/**
 * Message the owner and remember which conversation the message was about, so
 * that when they reply to it on their phone the reply can be routed back to
 * that customer. `kind`/`ref` are e.g. ("chat", "wa:9198…") or ("lead", "42").
 */
export async function tgAlertOwner(
  db: D1Database,
  env: TgEnv,
  html: string,
  opts: { buttons?: TgButton[][]; kind?: string; ref?: string } = {}
): Promise<TgResult> {
  const c = await tgConfig(db, env);
  if (!tgPaired(c)) return { ok: false, error: "telegram_not_paired" };
  const sent = await tgSend(c, c.chatId, html, { buttons: opts.buttons });
  if (sent.ok && opts.kind && opts.ref) {
    try {
      await db
        .prepare(
          `INSERT INTO tg_outbox (message_id, chat_id, kind, ref, created_at) VALUES (?,?,?,?,datetime('now'))`
        )
        .bind(sent.messageId, c.chatId, opts.kind, opts.ref)
        .run();
    } catch (e) {
      console.log("tg outbox not recorded:", String(e).slice(0, 200));
    }
  }
  if (!sent.ok) console.log("telegram alert not sent:", sent.error);
  return sent;
}

/** What an alert was about, looked up by the Telegram message the owner replied to. */
export async function tgOutboxLookup(db: D1Database, messageId: number): Promise<{ kind: string; ref: string } | null> {
  try {
    const row = await db
      .prepare(`SELECT kind, ref FROM tg_outbox WHERE message_id = ? ORDER BY id DESC LIMIT 1`)
      .bind(messageId)
      .first<{ kind: string; ref: string }>();
    return row ?? null;
  } catch {
    return null;
  }
}

/**
 * Pairing. The cockpit mints a six-digit code that lives fifteen minutes; the
 * owner sends it to the bot; the chat it came from becomes the owner's chat.
 * Anyone else guessing has a one-in-a-million shot inside a quarter of an hour.
 */
export async function tgMintPairCode(db: D1Database): Promise<string> {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await setSetting(db, "tg_pair_code", `${code}:${Date.now() + 15 * 60 * 1000}`);
  return code;
}

export async function tgTryPair(db: D1Database, code: string, chatId: string): Promise<boolean> {
  const stored = (await getSetting(db, "tg_pair_code")) || "";
  const [want, expires] = stored.split(":");
  if (!want || !expires || Date.now() > Number(expires)) return false;
  if (want !== code.trim()) return false;
  await setSetting(db, "tg_owner_chat_id", chatId);
  await setSetting(db, "tg_pair_code", "");
  return true;
}
