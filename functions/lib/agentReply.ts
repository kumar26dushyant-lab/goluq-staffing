/// <reference types="@cloudflare/workers-types" />

import { waConfig, waReady, waSendText, type WaEnv } from "./whatsapp";

/**
 * Send a reply AS THE OWNER into one conversation — from the cockpit or from
 * Telegram, the rules are the same and must live in one place.
 *
 * A WhatsApp thread is stored as `wa:<phone>` beside the website chats. The
 * website widget POLLS for agent replies, so writing one to the database is
 * enough to deliver it. WhatsApp has nothing polling — a reply only reaches the
 * customer if we actively send it through the Cloud API, and we send BEFORE
 * recording: a transcript showing a reply the customer never received is worse
 * than an obvious failure, because it also silences the guide.
 */
export const waPhoneOf = (sessionId: string): string =>
  sessionId.startsWith("wa:") ? sessionId.slice(3) : "";

export type ReplyResult = { ok: true } | { ok: false; error: string };

export async function sendAgentReply(
  env: WaEnv,
  db: D1Database,
  sessionId: string,
  text: string
): Promise<ReplyResult> {
  const body = String(text ?? "").trim().slice(0, 2000);
  if (!body) return { ok: false, error: "empty" };

  const phone = waPhoneOf(sessionId);
  if (phone) {
    const cfg = await waConfig(db, env);
    if (!waReady(cfg)) {
      return { ok: false, error: "WhatsApp is not configured, so this cannot be delivered." };
    }
    const sent = await waSendText(cfg, phone, body);
    if (!sent.ok) {
      const outsideWindow = /re-?engagement|24|template|131047|131026/i.test(sent.error);
      return {
        ok: false,
        error: outsideWindow
          ? "WhatsApp refused this: they last messaged you more than 24 hours ago, and outside that window only an approved template can be delivered."
          : `WhatsApp refused this: ${sent.error}`,
      };
    }
    // A reply to someone who has never messaged the number creates the thread.
    await db
      .prepare(
        `INSERT INTO chat_sessions (id, created_at, last_at, page, lang, visitor_phone)
         VALUES (?, datetime('now'), datetime('now'), 'whatsapp', 'en', ?)
         ON CONFLICT(id) DO NOTHING`
      )
      .bind(sessionId, phone)
      .run();
  }

  await db
    .prepare(
      `INSERT INTO chat_messages (session_id, role, content, created_at)
       VALUES (?, 'agent', ?, datetime('now'))`
    )
    .bind(sessionId, body)
    .run();
  await db
    .prepare(
      `UPDATE chat_sessions
          SET agent_joined = 1, needs_human = 0, unread_for_agent = 0, last_at = datetime('now')
        WHERE id = ?`
    )
    .bind(sessionId)
    .run();
  return { ok: true };
}
