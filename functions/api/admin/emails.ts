/// <reference types="@cloudflare/workers-types" />

import { checkAdmin } from "../../lib/admin";
import { mailEnabled, sendMail, type MailEnv } from "../../lib/mailer";

interface Env extends MailEnv {
  DB: D1Database;
  ADMIN_SECRET?: string;
}

/**
 * GET            → thread list (+ whether sending is configured)
 * GET ?id=<n>    → one thread's messages, marks it read
 * POST           → reply as the domain, or archive
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await checkAdmin(request, env))) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const id = new URL(request.url).searchParams.get("id");

  if (id) {
    const msgs = await env.DB.prepare(
      `SELECT id, direction, from_addr, to_addr, subject, body, message_id, created_at
         FROM email_messages WHERE thread_id = ? ORDER BY id`
    )
      .bind(id)
      .all();
    await env.DB.prepare(`UPDATE email_threads SET unread = 0 WHERE id = ?`).bind(id).run();
    const thread = await env.DB.prepare(`SELECT * FROM email_threads WHERE id = ?`)
      .bind(id)
      .first();
    return Response.json({ ok: true, thread, messages: msgs.results ?? [] });
  }

  const rows = await env.DB.prepare(
    `SELECT t.*,
            (SELECT body FROM email_messages m WHERE m.thread_id = t.id ORDER BY m.id DESC LIMIT 1) AS preview
       FROM email_threads t
      WHERE t.archived = 0
      ORDER BY t.last_at DESC LIMIT 100`
  ).all();
  const unread = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM email_threads WHERE unread > 0 AND archived = 0`
  ).first<{ n: number }>();

  return Response.json({
    ok: true,
    threads: rows.results ?? [],
    unread: unread?.n ?? 0,
    canSend: mailEnabled(env),
    from: env.MAIL_FROM || "",
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await checkAdmin(request, env))) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const b = await request.json<Record<string, unknown>>();
    const id = Number(b.id);
    if (!id) return Response.json({ ok: false, error: "no thread" }, { status: 400 });

    if (b.action === "archive") {
      await env.DB.prepare(`UPDATE email_threads SET archived = 1, unread = 0 WHERE id = ?`)
        .bind(id)
        .run();
      return Response.json({ ok: true });
    }

    const text = String(b.text ?? "").trim();
    if (!text) return Response.json({ ok: false, error: "empty" }, { status: 400 });

    const thread = await env.DB.prepare(
      `SELECT counterparty, subject FROM email_threads WHERE id = ?`
    )
      .bind(id)
      .first<{ counterparty: string; subject: string }>();
    if (!thread) return Response.json({ ok: false, error: "not found" }, { status: 404 });

    // Thread the reply under the most recent inbound message.
    const last = await env.DB.prepare(
      `SELECT message_id FROM email_messages
        WHERE thread_id = ? AND direction = 'in' AND message_id IS NOT NULL
        ORDER BY id DESC LIMIT 1`
    )
      .bind(id)
      .first<{ message_id: string }>();

    const subject = /^re:/i.test(thread.subject || "")
      ? thread.subject
      : `Re: ${thread.subject || "(no subject)"}`;

    const sent = await sendMail(env, {
      to: thread.counterparty,
      subject,
      text,
      inReplyTo: last?.message_id ?? null,
      references: last?.message_id ?? null,
    });
    if (!sent.ok) return Response.json({ ok: false, error: sent.error }, { status: 400 });

    await env.DB.prepare(
      `INSERT INTO email_messages (thread_id, direction, from_addr, to_addr, subject, body, message_id, created_at)
       VALUES (?, 'out', ?, ?, ?, ?, ?, datetime('now'))`
    )
      .bind(id, env.MAIL_FROM ?? "", thread.counterparty, subject, text, sent.messageId ?? null)
      .run();
    await env.DB.prepare(
      `UPDATE email_threads SET last_at = datetime('now'), unread = 0 WHERE id = ?`
    )
      .bind(id)
      .run();

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
};
