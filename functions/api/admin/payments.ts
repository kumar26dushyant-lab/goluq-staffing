/// <reference types="@cloudflare/workers-types" />

import { checkAdmin, unauthorized } from "../../lib/admin";
import { issuePaymentLink, callPriceInr, countryFromPhone, type PayEnv } from "../../lib/payments";
import { rzpConfig, rzpReady } from "../../lib/razorpay";
import { getSetting } from "../../lib/settings";

interface Env extends PayEnv {
  ADMIN_SECRET: string;
}

/**
 * GET → the ledger (last 200 links) plus upcoming and recent calls, so the
 *       owner can push a link at a booking with one tap.
 * POST { action: "issue", booking_id? , phone?, email?, name?, amount_inr?, description? }
 *       → a fresh link, sent on WhatsApp + email. For a booking, amount and
 *       description default to the founder call at its live Store price.
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await checkAdmin(request, env))) return unauthorized();
  const rows = await env.DB.prepare(
    `SELECT p.*, b.name AS booking_name, b.starts_at FROM payments p LEFT JOIN bookings b ON b.id = p.booking_id
      ORDER BY p.id DESC LIMIT 200`
  ).all();
  const calls = await env.DB.prepare(
    `SELECT b.id, b.name, b.email, b.phone, b.starts_at, b.ends_at, b.status,
            (SELECT status FROM payments WHERE booking_id = b.id ORDER BY id DESC LIMIT 1) AS pay_status
       FROM bookings b WHERE b.starts_at >= datetime('now','-14 days') AND b.status <> 'cancelled'
      ORDER BY b.starts_at DESC LIMIT 60`
  ).all();
  const totals = await env.DB.prepare(
    `SELECT COALESCE(SUM(CASE WHEN status='paid' THEN amount_inr END),0) AS paid,
            COALESCE(SUM(CASE WHEN status='issued' THEN amount_inr END),0) AS open,
            COALESCE(SUM(CASE WHEN status='paid' AND paid_at >= datetime('now','-30 days') THEN amount_inr END),0) AS paid30
       FROM payments`
  ).first<{ paid: number; open: number; paid30: number }>();
  return Response.json({
    ok: true,
    ready: rzpReady(await rzpConfig(env.DB)),
    dodo: Boolean((await getSetting(env.DB, "dodo_api_key"))),
    call_price_inr: await callPriceInr(env.DB),
    payments: rows.results ?? [],
    calls: calls.results ?? [],
    totals,
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await checkAdmin(request, env))) return unauthorized();
  const b = await request.json<{ action?: string; booking_id?: number; phone?: string; email?: string; name?: string; amount_inr?: number; description?: string; country?: string }>().catch(() => ({} as any));
  if (b.action !== "issue") return Response.json({ ok: false, error: "unknown action" }, { status: 400 });

  let phone = String(b.phone || "").replace(/\D/g, "");
  if (phone.length === 10) phone = "91" + phone;
  let email = String(b.email || "").trim().toLowerCase();
  let name = String(b.name || "").trim();
  let amount = Number(b.amount_inr || 0);
  let description = String(b.description || "").trim();
  let bookingId: number | null = null;
  let lang: string | null = null;

  if (b.booking_id) {
    const k = await env.DB.prepare("SELECT id, name, email, phone, ends_at, starts_at FROM bookings WHERE id = ?").bind(Number(b.booking_id))
      .first<{ id: number; name: string; email: string | null; phone: string | null; ends_at: string | null; starts_at: string }>();
    if (!k) return Response.json({ ok: false, error: "booking not found" }, { status: 404 });
    bookingId = k.id;
    phone = phone || String(k.phone || "").replace(/\D/g, "");
    if (phone.length === 10) phone = "91" + phone;
    email = email || String(k.email || "");
    name = name || k.name;
    if (!amount) amount = await callPriceInr(env.DB);
    if (!description) description = "your 30-minute call with Dushyant";
    // A link pushed by hand supersedes whatever was open for this booking.
    await env.DB.prepare("UPDATE payments SET status = 'cancelled' WHERE booking_id = ? AND status = 'issued'").bind(k.id).run();
  }
  if (phone) {
    const s = await env.DB.prepare("SELECT lang FROM chat_sessions WHERE id = ?").bind(`wa:${phone}`).first<{ lang: string | null }>();
    lang = s?.lang ?? null;
  }
  if (!description) return Response.json({ ok: false, error: "say what it is for" }, { status: 400 });

  const r = await issuePaymentLink(env, { kind: bookingId ? "call" : "cart", bookingId, phone: phone || null, email: email || null, name: name || null, amountInr: amount, description, lang, by: "pushed from the cockpit", country: String(b.country || "").toUpperCase().slice(0, 2) || countryFromPhone(phone) });
  return Response.json(r, { status: r.ok ? 200 : 400 });
};
