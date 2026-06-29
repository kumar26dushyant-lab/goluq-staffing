/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
  ADMIN_SECRET: string;
}

const RATE_YEAR1 = 0.35;
const RATE_LIFETIME = 0.12;

/**
 * Admin commission accrual (BUILD_SPEC §10A). Protected by x-admin-secret.
 * For each month, accrue at 35% (months 1–12) then 12% (month 13+) of the plan
 * price the customer actually bought.
 *
 * // PHASE 2: Razorpay webhook entry point — the same accrual body runs per
 * // successful charge instead of this manual admin call.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (request.headers.get("x-admin-secret") !== env.ADMIN_SECRET) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const b = await request.json<{
      affiliateCode: string;
      leadId?: number;
      customerRef: string;
      planPriceInr: number;
      months: number;
    }>();

    if (!b.affiliateCode || !b.customerRef || !b.planPriceInr || !b.months) {
      return Response.json({ ok: false, error: "missing fields" }, { status: 400 });
    }

    const now = new Date();
    const stmts: D1PreparedStatement[] = [];
    for (let m = 0; m < b.months; m++) {
      const rate = m < 12 ? RATE_YEAR1 : RATE_LIFETIME;
      const amount = rate * b.planPriceInr;
      const d = new Date(now.getFullYear(), now.getMonth() + m, 1);
      const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      stmts.push(
        env.DB.prepare(
          `INSERT INTO commissions (affiliate_code, lead_id, customer_ref, period_month, rate, amount_inr, status, created_at)
           VALUES (?,?,?,?,?,?, 'pending', datetime('now'))`
        ).bind(b.affiliateCode, b.leadId ?? null, b.customerRef, period, rate, amount)
      );
    }
    await env.DB.batch(stmts);

    return Response.json({ ok: true, accrued: b.months });
  } catch {
    return Response.json({ ok: false, error: "server" }, { status: 500 });
  }
};
