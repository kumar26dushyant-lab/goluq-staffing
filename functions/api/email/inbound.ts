/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
  ADMIN_SECRET?: string;
  INBOUND_SECRET?: string;
}

const clip = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n) || null;

/** Pull a bare address out of "Name <a@b.com>". */
function addr(raw: unknown): string {
  const s = String(raw ?? "");
  const m = s.match(/<([^>]+)>/);
  return (m ? m[1] : s).trim().toLowerCase().slice(0, 200);
}

/** Strip Re:/Fwd: so a reply lands in the same thread rather than a new one. */
function baseSubject(s: string): string {
  return s.replace(/^\s*((re|fwd|fw)\s*:\s*)+/i, "").trim();
}

/**
 * Normalised inbound email hook — deliberately provider-agnostic.
 *
 * Expects JSON: { from, to, subject, text, messageId?, inReplyTo? }
 * Anything that can POST that shape works: a Cloudflare Email Worker (see
 * deploy/email-worker.js), a Mailgun/Postmark route, or an IMAP poller.
 *
 * Auth: shared secret in `x-inbound-secret`. Without it this endpoint would let
 * anyone forge mail into the cockpit.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const expected = env.INBOUND_SECRET || env.ADMIN_SECRET || "";
  const got = request.headers.get("x-inbound-secret") || "";
  if (!expected || got !== expected) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const b = await request.json<Record<string, unknown>>();
    const from = addr(b.from);
    if (!from) return Response.json({ ok: false, error: "no sender" }, { status: 400 });

    const subject = clip(b.subject, 300) || "(no subject)";
    const body = clip(b.text, 50_000) || "";
    const messageId = clip(b.messageId, 300);
    const to = addr(b.to) || null;

    // Ignore a message we've already stored (providers retry on non-2xx).
    if (messageId) {
      const dupe = await env.DB.prepare(`SELECT 1 AS x FROM email_messages WHERE message_id = ?`)
        .bind(messageId)
        .first<{ x: number }>();
      if (dupe) return Response.json({ ok: true, duplicate: true });
    }

    // Thread on sender + normalised subject.
    const base = baseSubject(subject);
    let thread = await env.DB.prepare(
      `SELECT id FROM email_threads WHERE counterparty = ? AND subject = ? LIMIT 1`
    )
      .bind(from, base)
      .first<{ id: number }>();

    if (!thread) {
      await env.DB.prepare(
        `INSERT INTO email_threads (counterparty, subject, last_at, unread, created_at)
         VALUES (?,?,datetime('now'),1,datetime('now'))`
      )
        .bind(from, base)
        .run();
      thread = await env.DB.prepare(
        `SELECT id FROM email_threads WHERE counterparty = ? AND subject = ? ORDER BY id DESC LIMIT 1`
      )
        .bind(from, base)
        .first<{ id: number }>();
    } else {
      await env.DB.prepare(
        `UPDATE email_threads SET last_at = datetime('now'), unread = unread + 1, archived = 0 WHERE id = ?`
      )
        .bind(thread.id)
        .run();
    }

    await env.DB.prepare(
      `INSERT INTO email_messages (thread_id, direction, from_addr, to_addr, subject, body, message_id, created_at)
       VALUES (?, 'in', ?, ?, ?, ?, ?, datetime('now'))`
    )
      .bind(thread!.id, from, to, subject, body, messageId)
      .run();

    return Response.json({ ok: true, threadId: thread!.id });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
};
