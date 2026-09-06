/// <reference types="@cloudflare/workers-types" />

import { checkAdmin } from "../../lib/admin";

interface Env {
  DB: D1Database;
  ADMIN_SECRET?: string;
}

/**
 * The commission ledger, and moving rows through it.
 *
 * Accrual itself happens in api/admin/projects.ts when a payment is recorded
 * against a project — commission is a consequence of money arriving, so it is
 * booked at the moment the owner records that money, never forward-booked.
 *
 *   GET  ?code=<affiliate>                    → ledger (all partners when omitted)
 *   POST { action: "status",  id, status }    → pending | approved | paid
 *   POST { action: "convert", leadId }        → mark a lead as a paying customer
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await checkAdmin(request, env))) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const code = new URL(request.url).searchParams.get("code");
  const sql = `SELECT c.*, COALESCE(cu.name, l.name) AS customer, p.title AS project, a.name AS partner, a.upi_id
                 FROM commissions c
                 LEFT JOIN leads l ON l.id = c.lead_id
                 LEFT JOIN projects p ON p.id = c.project_id
                 LEFT JOIN customers cu ON cu.id = p.customer_id
                 LEFT JOIN affiliates a ON a.code = c.affiliate_code
                ${code ? "WHERE c.affiliate_code = ?" : ""}
                ORDER BY c.id DESC LIMIT 200`;
  const stmt = env.DB.prepare(sql);
  const rows = code ? await stmt.bind(code).all() : await stmt.all();
  return Response.json({ ok: true, commissions: rows.results ?? [] });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await checkAdmin(request, env))) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const b = await request.json<Record<string, unknown>>();
    const action = String(b.action ?? "");

    if (action === "convert") {
      const leadId = Number(b.leadId);
      if (!leadId) return Response.json({ ok: false, error: "leadId required" }, { status: 400 });
      await env.DB.prepare(
        `UPDATE leads
            SET status = 'converted', next_followup_at = NULL,
                converted_at = COALESCE(converted_at, datetime('now'))
          WHERE id = ?`
      )
        .bind(leadId)
        .run();
      return Response.json({ ok: true });
    }

    // pending → approved → paid. Approving is the owner's review; paid is the
    // UPI transfer having gone out.
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
