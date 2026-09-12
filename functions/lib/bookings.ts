/// <reference types="@cloudflare/workers-types" />

/**
 * The one question every surface asks before offering the calendar: does
 * this person already have a call in the diary? Google's booking page is
 * stateless — it shows a fresh calendar to everyone — so the memory has to
 * be ours, and it lives in the `bookings` table the calendar bridge fills.
 */
export interface Upcoming {
  id: number;
  name: string;
  startsAt: string;      // SQLite UTC text
  meetUrl: string | null;
  whenIst: string;
}

export async function upcomingBooking(db: D1Database, phone: string | null, email: string | null): Promise<Upcoming | null> {
  const last10 = (phone || "").replace(/\D/g, "").slice(-10);
  const conds: string[] = [];
  const binds: string[] = [];
  if (last10.length === 10) { conds.push("phone LIKE ?"); binds.push(`%${last10}`); }
  if (email) { conds.push("lower(email) = ?"); binds.push(email.toLowerCase()); }
  if (!conds.length) return null;
  const row = await db.prepare(
    `SELECT id, name, starts_at, meet_url FROM bookings
      WHERE status = 'booked' AND starts_at >= datetime('now','-15 minutes') AND (${conds.join(" OR ")})
      ORDER BY starts_at LIMIT 1`
  ).bind(...binds).first<{ id: number; name: string; starts_at: string; meet_url: string | null }>();
  if (!row) return null;
  return { id: row.id, name: row.name, startsAt: row.starts_at, meetUrl: row.meet_url, whenIst: istLabel(row.starts_at) };
}

export function istLabel(s: string): string {
  return new Date(s.replace(" ", "T") + "Z").toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  });
}

/** Ways people ask to move or drop a call, in the languages they write. */
export const BOOKING_CHANGE = /\b(cancel|reschedule|postpone|change|move|shift)\b.*\b(call|appointment|meeting|slot|booking)\b|\b(call|appointment|meeting|slot|booking)\b.*\b(cancel|reschedule|postpone|change|move|shift)\b|कॉल\s*(कैंसल|रद्द|बदल|आगे)|(मीटिंग|अपॉइंटमेंट|समय)\s*(कैंसल|रद्द|बदल)|(बदलना|बदल दो|रद्द कर)/i;

/** Ways people ask to book a call. */
export const BOOKING_ASK = /\b(book|schedule|fix|set up|setup)\b.*\b(call|appointment|meeting|slot|demo)\b|\b(appointment|meeting|call)\s*(book|schedule)|कॉल\s*बुक|अपॉइंटमेंट|मीटिंग\s*(बुक|फिक्स|रख)|समय\s*(दीजिए|दो|बुक)/i;
