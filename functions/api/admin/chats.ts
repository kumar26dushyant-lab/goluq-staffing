/// <reference types="@cloudflare/workers-types" />

import { checkAdmin } from "../../lib/admin";
import { sendAgentReply } from "../../lib/agentReply";
import type { WaEnv } from "../../lib/whatsapp";

interface Env extends WaEnv {
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
  if (!(await checkAdmin(request, env))) {
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
  if (!(await checkAdmin(request, env))) {
    return Response.json({ ok: false, error: "unauthorised" }, { status: 401 });
  }
  try {
    const b = await request.json<Record<string, unknown>>();
    const id = String(b.id ?? "").slice(0, 40);
    if (!id) return Response.json({ ok: false, error: "no id" }, { status: 400 });

    // Explicit control over the guide for one conversation. A manual reply
    // only PAUSES it for a while; this is how the owner turns it off for good,
    // or hands a thread back once they are done.
    if (b.action === "bot") {
      const off = b.off === true || b.off === "1" ? 1 : 0;
      await env.DB.prepare("UPDATE chat_sessions SET bot_off = ? WHERE id = ?").bind(off, id).run();
      return Response.json({ ok: true, bot_off: off });
    }

    if (b.action === "close") {
      await env.DB.prepare(
        `UPDATE chat_sessions SET closed = 1, needs_human = 0 WHERE id = ?`
      )
        .bind(id)
        .run();
      return Response.json({ ok: true });
    }

    const r = await sendAgentReply(env, env.DB, id, String(b.text ?? ""));
    if (!r.ok) return Response.json({ ok: false, error: r.error });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
};
