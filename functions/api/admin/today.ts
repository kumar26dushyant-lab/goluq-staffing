/// <reference types="@cloudflare/workers-types" />

import { checkAdmin, unauthorized } from "../../lib/admin";

interface Env {
  DB: D1Database;
  ADMIN_SECRET: string;
}

/**
 * The cockpit's landing board: what needs the owner right now, in one call.
 *
 * Built around a single question — "who is waiting for me?" — rather than
 * around tables. Everything here is a list of people, newest first, each one
 * tappable into the conversation or the enquiry behind it.
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await checkAdmin(request, env))) return unauthorized();
  const db = env.DB;

  const sessionsSql = (where: string, limit: number) => `
    SELECT s.id, s.visitor_name, s.visitor_phone, s.page, s.lang, s.last_at, s.created_at,
           s.needs_human, s.unread_for_agent, s.bot_off, s.closed,
           (SELECT content FROM chat_messages m WHERE m.session_id = s.id ORDER BY m.id DESC LIMIT 1) AS last_message,
           (SELECT role FROM chat_messages m WHERE m.session_id = s.id ORDER BY m.id DESC LIMIT 1) AS last_role,
           (SELECT COUNT(*) FROM chat_messages m WHERE m.session_id = s.id) AS msg_count
      FROM chat_sessions s
     WHERE (SELECT COUNT(*) FROM chat_messages m WHERE m.session_id = s.id) > 0 ${where}
     ORDER BY s.last_at DESC LIMIT ${limit}`;

  const waiting = await db.prepare(sessionsSql("AND s.needs_human = 1 AND s.closed = 0", 20)).all();
  const unread = await db
    .prepare(sessionsSql("AND s.needs_human = 0 AND s.closed = 0 AND s.unread_for_agent > 0", 20))
    .all();
  const recent = await db.prepare(sessionsSql("", 15)).all();

  const newLeads = await db
    .prepare(
      `SELECT id, name, phone, email, industry, role, message, source, ref_code, status, created_at, next_followup_at
         FROM leads
        WHERE COALESCE(status,'new') IN ('new','engaged') AND created_at >= datetime('now','-14 days')
        ORDER BY id DESC LIMIT 20`
    )
    .all();

  const one = async (sql: string) => (await db.prepare(sql).first<number>("c")) ?? 0;
  const counts = {
    leadsToday: await one("SELECT COUNT(*) AS c FROM leads WHERE date(created_at) = date('now')"),
    leadsWeek: await one("SELECT COUNT(*) AS c FROM leads WHERE created_at >= datetime('now','-7 days')"),
    waToday: await one(
      "SELECT COUNT(DISTINCT session_id) AS c FROM chat_messages WHERE role = 'visitor' AND session_id LIKE 'wa:%' AND date(created_at) = date('now')"
    ),
    webToday: await one(
      "SELECT COUNT(DISTINCT session_id) AS c FROM chat_messages WHERE role = 'visitor' AND session_id NOT LIKE 'wa:%' AND date(created_at) = date('now')"
    ),
    followupsDue: await one(
      "SELECT COUNT(*) AS c FROM leads WHERE opted_out = 0 AND next_followup_at IS NOT NULL AND next_followup_at <= datetime('now','+1 day')"
    ),
    visitorsToday: 0,
  };
  // The visits table predates this board; its shape is not something to guess
  // at, so a failure here just hides the tile.
  try {
    counts.visitorsToday = await one(
      "SELECT COUNT(DISTINCT session_id) AS c FROM visits WHERE date(created_at) = date('now')"
    );
  } catch {
    counts.visitorsToday = -1;
  }

  // Bookings arrive once the calendar bridge is connected; until the table
  // exists the board simply has no bookings card.
  let bookings: unknown[] = [];
  try {
    const b = await db
      .prepare(
        `SELECT id, name, email, phone, starts_at, ends_at, meet_url, note, status
           FROM bookings WHERE starts_at >= datetime('now','-2 hours') AND status <> 'cancelled'
          ORDER BY starts_at ASC LIMIT 10`
      )
      .all();
    bookings = b.results ?? [];
  } catch {
    bookings = [];
  }

  return Response.json({
    ok: true,
    now: new Date().toISOString(),
    waiting: waiting.results ?? [],
    unread: unread.results ?? [],
    recent: recent.results ?? [],
    newLeads: newLeads.results ?? [],
    counts,
    bookings,
  });
};
