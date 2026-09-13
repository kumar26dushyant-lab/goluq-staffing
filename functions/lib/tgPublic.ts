/// <reference types="@cloudflare/workers-types" />

import { getSetting, setSetting } from "./settings";
import { randomToken } from "./auth";

/**
 * The customer-facing Telegram bot (not the owner's cockpit bot). Token is
 * write-only in the cockpit; connecting it sets the webhook and learns the
 * username, which then becomes the site's public Telegram link.
 */
export interface PublicBot { token: string; secret: string; username: string }

export const PUBLIC_WEBHOOK_URL = "https://goluq.com/api/tg/public";

export async function publicBot(db: D1Database): Promise<PublicBot> {
  const s = async (k: string) => (await getSetting(db, k)) || "";
  return { token: await s("public_tg_bot_token"), secret: await s("public_tg_webhook_secret"), username: await s("public_tg_bot_username") };
}

async function call(token: string, method: string, payload: Record<string, unknown>): Promise<{ ok: boolean; result?: any; error?: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const j: any = await res.json().catch(() => ({}));
    if (!res.ok || !j?.ok) return { ok: false, error: String(j?.description || `http_${res.status}`).slice(0, 200) };
    return { ok: true, result: j.result };
  } catch (e) {
    return { ok: false, error: String(e).slice(0, 200) };
  }
}

export async function publicSend(bot: PublicBot, chatId: string, text: string): Promise<{ ok: boolean; error?: string }> {
  if (!bot.token) return { ok: false, error: "telegram_public_not_configured" };
  const r = await call(bot.token, "sendMessage", { chat_id: chatId, text: String(text).slice(0, 4000), disable_web_page_preview: true });
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

/** Learn the username, point Telegram at our webhook, expose the bot on the site. */
export async function publicConnect(db: D1Database): Promise<{ ok: boolean; username?: string; error?: string }> {
  const bot = await publicBot(db);
  if (!bot.token) return { ok: false, error: "No customer bot token set." };
  const me = await call(bot.token, "getMe", {});
  if (!me.ok) return { ok: false, error: me.error };
  const username = String(me.result?.username || "");
  let secret = bot.secret;
  if (!secret) { secret = randomToken(24); await setSetting(db, "public_tg_webhook_secret", secret); }
  const wh = await call(bot.token, "setWebhook", { url: PUBLIC_WEBHOOK_URL, secret_token: secret, allowed_updates: ["message"], drop_pending_updates: true });
  if (!wh.ok) return { ok: false, error: wh.error };
  await setSetting(db, "public_tg_bot_username", username);
  if (username) await setSetting(db, "public_telegram", username);
  return { ok: true, username };
}
