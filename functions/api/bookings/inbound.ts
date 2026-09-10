/// <reference types="@cloudflare/workers-types" />

import { getSetting } from "../../lib/settings";
import { tgAlertOwner, tgEscape } from "../../lib/telegram";
import { issuePaymentLink, callIntentFor, callPriceInr, type PayEnv } from "../../lib/payments";

type Env = PayEnv;

/**
 * A booking (or cancellation) from the owner's Google Calendar, posted by the
 * Apps Script in docs/booking-bridge. Authenticated by a shared secret the
 * cockpit shows once; nothing else on the internet knows it.
 *
 *   POST { secret, event_id, name, email?, phone?, starts_at, ends_at?,
 *          meet_url?, note?, status: "booked" | "cancelled" }
 *
 * Idempotent on event_id: the script re-posts on every change and the row
 * simply follows the calendar.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let b: Record<string, unknown>;
  try {
    b = await request.json<Record<string, unknown>>();
  } catch {
    return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const want = (await getSetting(env.DB, "booking_secret")) || "";
  if (!want || String(b.secret || "") !== want) {
    return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const clip = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);
  const eventId = clip(b.event_id, 200);
  const name = clip(b.name, 120) || "Someone";
  const startsAt = toSql(clip(b.starts_at, 40));
  if (!eventId || !startsAt) {
    return Response.json({ ok: false, error: "event_id and starts_at required" }, { status: 400 });
  }
  const status = clip(b.status, 20) === "cancelled" ? "cancelled" : "booked";
  const email = clip(b.email, 200).toLowerCase() || null;
  const phone = clip(b.phone, 30).replace(/[^\d+]/g, "") || null;
  const endsAt = toSql(clip(b.ends_at, 40));
  const meet = /^https:\/\//i.test(clip(b.meet_url, 300)) ? clip(b.meet_url, 300) : null;
  const note = clip(b.note, 2000) || null;

  const prior = await env.DB.prepare("SELECT id, status FROM bookings WHERE event_id = ?")
    .bind(eventId)
    .first<{ id: number; status: string }>();

  await env.DB.prepare(
    `INSERT INTO bookings (event_id, name, email, phone, starts_at, ends_at, meet_url, note, status, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))
     ON CONFLICT(event_id) DO UPDATE SET
       name = excluded.name, email = excluded.email, phone = excluded.phone,
       starts_at = excluded.starts_at, ends_at = excluded.ends_at, meet_url = excluded.meet_url,
       note = excluded.note, status = excluded.status, updated_at = datetime('now')`
  )
    .bind(eventId, name, email, phone, startsAt, endsAt, meet, note, status)
    .run();

  // A booking usually comes from someone who already enquired; keep the lead's
  // status honest so follow-ups stop nagging a person who has a call in the diary.
  if (phone && status === "booked") {
    const last10 = phone.replace(/\D/g, "").slice(-10);
    if (last10.length === 10) {
      await env.DB.prepare(
        `UPDATE leads SET status = CASE WHEN status = 'new' THEN 'engaged' ELSE status END, next_followup_at = NULL
          WHERE phone LIKE ? AND opted_out = 0`
      )
        .bind(`%${last10}`)
        .run();
    }
  }

  // Tell the owner — once for a new booking, once for a cancellation.
  const isNew = !prior;
  const cancelled = status === "cancelled" && prior?.status !== "cancelled";
  if (isNew || cancelled) {
    const when = new Date(startsAt.replace(" ", "T") + "Z").toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
    });
    const lines = [
      cancelled ? `❌ <b>Call cancelled</b> · ${tgEscape(name)}` : `📅 <b>Call booked</b> · ${tgEscape(name)}`,
      "",
      `🕒 ${tgEscape(when)} IST`,
      phone ? `📱 ${tgEscape(phone)}` : "",
      email ? `✉️ ${tgEscape(email)}` : "",
      note ? `\n<i>${tgEscape(note.slice(0, 800))}</i>` : "",
    ].filter((l) => l !== "");
    await tgAlertOwner(env.DB, env, lines.join("\n"), {
      buttons: [[
        ...(meet ? [{ text: "Join Meet", url: meet }] : []),
        ...(phone ? [{ text: "Open WhatsApp", url: `https://wa.me/${phone.replace(/\D/g, "")}` }] : []),
      ]],
    });
  }

  // The founder call is a paid product. A new booking from someone who put it
  // in their WhatsApp cart (or every booking, if the owner says so) gets the
  // link now, valid until half an hour after the call — pay before or after.
  let payment: string | null = null;
  if (isNew && status === "booked") {
    const row = await env.DB.prepare("SELECT id FROM bookings WHERE event_id = ?").bind(eventId).first<{ id: number }>();
    const everyone = (await getSetting(env.DB, "call_paid_all")) === "1";
    const intent = await callIntentFor(env.DB, phone, email);
    if (row && (intent || everyone)) {
      const price = await callPriceInr(env.DB);
      const toPhone = phone && phone.replace(/\D/g, "").length >= 10 ? phone.replace(/\D/g, "").replace(/^0+/, "") : intent?.phone || null;
      const endMs = Date.parse((endsAt || startsAt).replace(" ", "T") + "Z") + (endsAt ? 0 : 30 * 60e3);
      const expiresAt = new Date(endMs + 30 * 60e3).toISOString().slice(0, 19).replace("T", " ");
      const hi = intent?.lang === "hi";
      const whenIst = new Date(startsAt.replace(" ", "T") + "Z").toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
      const r = await issuePaymentLink(env, {
        kind: "call", bookingId: row.id, phone: toPhone && toPhone.length === 10 ? "91" + toPhone : toPhone, email, name,
        amountInr: price, description: hi ? "दुष्यंत के साथ 30 मिनट की कॉल" : "your 30-minute call with Dushyant",
        expiresAt, lang: intent?.lang ?? null, by: "new booking",
        intro: hi
          ? `आपकी कॉल ${whenIst} IST पर तय हो गई है${meet ? ` — Meet लिंक: ${meet}` : ""}।\n\n₹${price.toLocaleString("en-IN")} का पेमेंट लिंक यह रहा — अभी दें या मीटिंग के बाद; यह मीटिंग के आधे घंटे बाद तक चलेगा।`
          : `Your call with Dushyant is booked for ${whenIst} IST${meet ? ` — Meet link: ${meet}` : ""}.\n\nHere is the ₹${price.toLocaleString("en-IN")} payment link — pay now or after the meeting; it stays valid until half an hour after the call.`,
      });
      payment = r.ok ? r.url : r.error;
    }
  }

  return Response.json({ ok: true, id: prior?.id ?? null, status, payment });
};

/** ISO or "YYYY-MM-DD HH:MM" → SQLite UTC text; "" when unparseable. */
function toSql(v: string): string {
  if (!v) return "";
  const t = Date.parse(v);
  if (!Number.isFinite(t)) return "";
  return new Date(t).toISOString().slice(0, 19).replace("T", " ");
}
