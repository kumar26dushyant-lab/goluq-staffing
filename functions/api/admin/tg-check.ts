/// <reference types="@cloudflare/workers-types" />

import { checkAdmin, unauthorized } from "../../lib/admin";
import { randomToken } from "../../lib/auth";
import { getSetting, setSetting } from "../../lib/settings";
import {
  TG_WEBHOOK_URL, tgConfig, tgGetMe, tgMintPairCode, tgPaired, tgReady, tgSend, tgSetWebhook, tgWebhookInfo,
  type TgEnv,
} from "../../lib/telegram";

interface Env extends TgEnv {
  DB: D1Database;
  ADMIN_SECRET?: string;
}

/**
 * Cockpit → Telegram plumbing.
 *
 *   GET                       → is a token set, is the webhook registered, is a chat paired
 *   POST { action: "connect" } → register the webhook and mint a pairing code
 *   POST { action: "test" }    → send "hello" to the paired chat
 *   POST { action: "unpair" }  → forget the chat id
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await checkAdmin(request, env))) return unauthorized();
  const c = await tgConfig(env.DB, env);
  if (!tgReady(c)) return Response.json({ ok: true, configured: false, paired: false });
  const [me, hook] = await Promise.all([tgGetMe(c), tgWebhookInfo(c)]);
  if (me.ok && me.username && me.username !== c.username) await setSetting(env.DB, "tg_bot_username", me.username);
  return Response.json({
    ok: true,
    configured: true,
    tokenValid: me.ok,
    tokenError: me.error || "",
    username: me.username || c.username || "",
    webhookUrl: hook.url || "",
    webhookOk: hook.ok && hook.url === TG_WEBHOOK_URL,
    webhookError: hook.lastError || hook.error || "",
    pending: hook.pending ?? 0,
    paired: tgPaired(c),
    chatId: c.chatId,
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await checkAdmin(request, env))) return unauthorized();
  let b: { action?: string } = {};
  try {
    b = await request.json();
  } catch {
    return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const c = await tgConfig(env.DB, env);
  if (!tgReady(c)) return Response.json({ ok: false, error: "Paste the bot token and save it first." });

  if (b.action === "connect") {
    const me = await tgGetMe(c);
    if (!me.ok) return Response.json({ ok: false, error: `Telegram rejected the token: ${me.error}` });
    await setSetting(env.DB, "tg_bot_username", me.username || "");

    // The secret is minted once and kept: rotating it on every Connect would
    // invalidate updates already in flight.
    let secret = (await getSetting(env.DB, "tg_webhook_secret")) || "";
    if (!secret) {
      secret = randomToken(24);
      await setSetting(env.DB, "tg_webhook_secret", secret);
    }
    const hook = await tgSetWebhook({ ...c, secret }, TG_WEBHOOK_URL, secret);
    if (!hook.ok) return Response.json({ ok: false, error: `Webhook not set: ${hook.error}` });

    const code = await tgMintPairCode(env.DB);
    return Response.json({
      ok: true,
      username: me.username,
      pairCode: code,
      deepLink: `https://t.me/${me.username}?start=${code}`,
      expiresInMin: 15,
    });
  }

  if (b.action === "test") {
    if (!tgPaired(c)) return Response.json({ ok: false, error: "No chat is paired yet." });
    const r = await tgSend(c, c.chatId, "👋 Test from the GoLuQ cockpit. Alerts will arrive here.");
    return Response.json(r.ok ? { ok: true } : { ok: false, error: r.error });
  }

  if (b.action === "unpair") {
    await setSetting(env.DB, "tg_owner_chat_id", "");
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false, error: "unknown action" }, { status: 400 });
};
