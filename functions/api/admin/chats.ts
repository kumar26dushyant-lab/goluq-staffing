/// <reference types="@cloudflare/workers-types" />

import { checkAdmin } from "../../lib/admin";

interface Env {
  DB: D1Database;
  ADMIN_SECRET?: string;
}

/**
 * Owner side of live chat.
 *
 * GET  ?id=<session>  → full transcript for one conversation
 * GET  (no id)        → inbox: waiting-for-human first, then most recent
 * POST                → send a reply as the owner, or close the conversation
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!checkAdmin(request, env)) {
    return Response.json({ ok: false, error: "unauthorised" }, { status: 401 });
  }
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (id) {
    const msgs = await env.DB.prepare(
      `SELECT id, role, content, created_at FROM chat_messages
        WHERE session_id = ? ORDER BY id`
    )
      .bind(id)
      .all();
    // Opening a conversation clears its unread badge.
    await env.DB.prepare(`UPDATE chat_sessions SET unread_for_agent = 0 WHERE id = ?`)
      .bind(id)
      .run();
    const session = await env.DB.prepare(`SELECT * FROM chat_sessions WHERE id = ?`)
      .bind(id)
      .first();
    return Response.json({ ok: true, session, messages: msgs.results ?? [] });
  }

  const rows = await env.DB.prepare(
    `SELECT s.*,
            (SELECT content FROM chat_messages m WHERE m.session_id = s.id ORDER BY m.id DESC LIMIT 1) AS last_message,
            (SELECT COUNT(*) FROM chat_messages m WHERE m.session_id = s.id) AS msg_count
       FROM chat_sessions s
      WHERE (SELECT COUNT(*) FROM chat_messages m WHERE m.session_id = s.id) > 0
      ORDER BY s.needs_human DESC, s.last_at DESC
      LIMIT 60`
  ).all();

  const waiting = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM chat_sessions WHERE needs_human = 1 AND closed = 0`
  ).first<{ n: number }>();

  return Response.json({
    ok: true,
    chats: rows.results ?? [],
    waiting: waiting?.n ?? 0,
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!checkAdmin(request, env)) {
    return Response.json({ ok: false, error: "unauthorised" }, { status: 401 });
  }
  try {
    const b = await request.json<Record<string, unknown>>();
    const id = String(b.id ?? "").slice(0, 40);
    if (!id) return Response.json({ ok: false, error: "no id" }, { status: 400 });

    if (b.action === "close") {
      await env.DB.prepare(
        `UPDATE chat_sessions SET closed = 1, needs_human = 0 WHERE id = ?`
      )
        .bind(id)
        .run();
      return Response.json({ ok: true });
    }

    const text = String(b.text ?? "").trim().slice(0, 2000);
    if (!text) return Response.json({ ok: false, error: "empty" }, { status: 400 });

    await env.DB.prepare(
      `INSERT INTO chat_messages (session_id, role, content, created_at)
       VALUES (?, 'agent', ?, datetime('now'))`
    )
      .bind(id, text)
      .run();
    await env.DB.prepare(
      `UPDATE chat_sessions
          SET agent_joined = 1, needs_human = 0, unread_for_agent = 0, last_at = datetime('now')
        WHERE id = ?`
    )
      .bind(id)
      .run();

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
};
