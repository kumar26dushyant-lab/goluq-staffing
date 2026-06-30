/// <reference types="@cloudflare/workers-types" />

import { classifyReply, type GeminiEnv } from "../../lib/gemini";

interface Env extends GeminiEnv {
  DB: D1Database;
}

/** Pull the sender's phone + text out of an Evolution MESSAGES_UPSERT payload. */
function parseInbound(body: any): { phone: string; text: string; fromMe: boolean } | null {
  const data = body?.data ?? body;
  const key = data?.key ?? {};
  const remoteJid: string = key?.remoteJid || "";
  const fromMe: boolean = Boolean(key?.fromMe);
  const msg = data?.message ?? {};
  const text: string =
    msg?.conversation ||
    msg?.extendedTextMessage?.text ||
    msg?.imageMessage?.caption ||
    "";
  const digits = (remoteJid.split("@")[0] || "").replace(/\D/g, "");
  if (!digits) return null;
  return { phone: digits, text, fromMe };
}

/**
 * Inbound WhatsApp webhook (Evolution → GoLuQ). Records that a lead replied and,
 * if they ask to stop / say not-interested, opts them out so follow-ups halt
 * immediately (the "fallback" so we never nag). Always returns 200 fast.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = await request.json<any>();
    const event = body?.event || body?.type || "";
    if (typeof event === "string" && event && !event.toLowerCase().includes("messages")) {
      return Response.json({ ok: true, ignored: event });
    }

    const inbound = parseInbound(body);
    if (!inbound || inbound.fromMe || !inbound.phone) {
      return Response.json({ ok: true });
    }

    // Match against the last 10 digits (stored numbers may or may not have 91).
    const last10 = inbound.phone.slice(-10);

    // Record the reply.
    await env.DB.prepare(
      `UPDATE leads SET last_inbound_at = datetime('now') WHERE substr(phone, -10) = ?`
    ).bind(last10).run();

    const intent = await classifyReply(env, inbound.text);
    if (intent === "stop") {
      await env.DB.prepare(
        `UPDATE leads SET opted_out = 1, status = 'opted_out', next_followup_at = NULL
         WHERE substr(phone, -10) = ?`
      ).bind(last10).run();
    } else if (intent === "interested") {
      await env.DB.prepare(
        `UPDATE leads SET status = 'engaged' WHERE substr(phone, -10) = ? AND status != 'opted_out'`
      ).bind(last10).run();
    }

    return Response.json({ ok: true, intent });
  } catch {
    // Never surface errors to Evolution — just ack.
    return Response.json({ ok: true });
  }
};
