/// <reference types="@cloudflare/workers-types" />

import { checkAdmin } from "../../lib/admin";
import { getRates, rateForMonth } from "../../lib/affiliateRates";

interface Env {
  DB: D1Database;
  ADMIN_SECRET?: string;
}

/**
 * Commission accrual — the step that was missing entirely.
 *
 * The old /api/affiliate/convert forward-booked N months of commission the
 * moment a customer converted, which books money that has not been earned and
 * cannot be undone if they cancel in month two. This accrues **one month per
 * recorded payment** instead, which is what actually happened.
 *
 * There is no payment gateway yet, so the owner records payments from the
 * cockpit. When one is added later, it calls this same endpoint per invoice and
 * nothing else changes.
 *
 *   POST { action: "convert", leadId, planId, planPriceInr }  → mark converted
 *   POST { action: "accrue",  leadId, period }                → one month's commission
 *   POST { action: "status",  id, status }                    → pending|approved|paid
 *   GET  ?code=<affiliate>                                    → ledger for one partner
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await checkAdmin(request, env))) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const code = new URL(request.url).searchParams.get("code");
  const rows = code
    ? await env.DB.prepare(
        `SELECT c.*, l.name AS lead_name FROM commissions c
           LEFT JOIN leads l ON l.id = c.lead_id
          WHERE c.affiliate_code = ? ORDER BY c.id DESC LIMIT 200`
      )
        .bind(code)
        .all()
    : await env.DB.prepare(
        `SELECT c.*, l.name AS lead_name FROM commissions c
           LEFT JOIN leads l ON l.id = c.lead_id
          ORDER BY c.id DESC LIMIT 200`
      ).all();
  return Response.json({ ok: true, commissions: rows.results ?? [] });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await checkAdmin(request, env))) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const b = await request.json<Record<string, unknown>>();
    const action = String(b.action ?? "");

    // ── Mark a lead as a paying customer ───────────────────────────────
    if (action === "convert") {
      const leadId = Number(b.leadId);
      const planId = String(b.planId ?? "");
      const price = Number(b.planPriceInr);
      if (!leadId || !price) {
        return Response.json({ ok: false, error: "leadId and planPriceInr required" }, { status: 400 });
      }
      await env.DB.prepare(
        `UPDATE leads
            SET status = 'converted',
                converted_at = COALESCE(converted_at, datetime('now')),
                plan_id = ?, plan_price_inr = ?
          WHERE id = ?`
      )
        .bind(planId || null, price, leadId)
        .run();
      return Response.json({ ok: true });
    }

    // ── Record one month's payment → one commission row ────────────────
    if (action === "accrue") {
      const leadId = Number(b.leadId);
      const period = String(b.period ?? ""); // YYYY-MM
      if (!leadId || !/^\d{4}-\d{2}$/.test(period)) {
        return Response.json({ ok: false, error: "leadId and period (YYYY-MM) required" }, { status: 400 });
      }

      const lead = await env.DB.prepare(
        `SELECT id, ref_code, converted_at, plan_price_inr FROM leads WHERE id = ?`
      )
        .bind(leadId)
        .first<{ id: number; ref_code: string | null; converted_at: string | null; plan_price_inr: number | null }>();

      if (!lead) return Response.json({ ok: false, error: "lead not found" }, { status: 404 });
      if (!lead.ref_code) {
        return Response.json(
          { ok: false, error: "This customer wasn't referred by a partner — no commission is due." },
          { status: 400 }
        );
      }
      if (!lead.plan_price_inr) {
        return Response.json(
          { ok: false, error: "Mark the customer converted with a plan price first." },
          { status: 400 }
        );
      }

      // Idempotent: recording the same month twice must not pay twice.
      const dupe = await env.DB.prepare(
        `SELECT 1 AS x FROM commissions WHERE lead_id = ? AND period_month = ?`
      )
        .bind(leadId, period)
        .first<{ x: number }>();
      if (dupe) {
        return Response.json({ ok: false, error: `${period} is already recorded for this customer.` }, { status: 409 });
      }

      const rates = await getRates(env.DB);
      const rate = rateForMonth(rates, lead.converted_at, period);
      const amount = Math.round(rate * lead.plan_price_inr);

      await env.DB.prepare(
        `INSERT INTO commissions
           (affiliate_code, lead_id, customer_ref, period_month, rate, amount_inr, status, created_at)
         VALUES (?,?,?,?,?,?, 'pending', datetime('now'))`
      )
        .bind(lead.ref_code, leadId, `lead-${leadId}`, period, rate, amount)
        .run();

      return Response.json({ ok: true, rate, amount });
    }

    // ── Move a commission through pending → approved → paid ────────────
    if (action === "status") {
      const id = Number(b.id);
      const status = String(b.status ?? "");
      if (!id || !["pending", "approved", "paid"].includes(status)) {
        return Response.json({ ok: false, error: "bad status" }, { status: 400 });
      }
      await env.DB.prepare(
        `UPDATE commissions
            SET status = ?, paid_at = CASE WHEN ? = 'paid' THEN datetime('now') ELSE paid_at END
          WHERE id = ?`
      )
        .bind(status, status, id)
        .run();
      return Response.json({ ok: true });
    }

    return Response.json({ ok: false, error: "unknown action" }, { status: 400 });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
};
