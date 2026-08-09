/// <reference types="@cloudflare/workers-types" />

import { affiliateFromSession } from "./auth";
import { getRates } from "../../lib/affiliateRates";

interface Env {
  DB: D1Database;
}

/**
 * Everything an affiliate sees about their OWN referrals — never anyone else's.
 *
 * Accepts either the new login session (`x-affiliate-token`) or the legacy
 * secret dashboard token in the query string, so partners who registered before
 * accounts existed don't lose access on the day this ships.
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const sessionToken = request.headers.get("x-affiliate-token") || "";
    const legacyToken = url.searchParams.get("token") || "";

    let aff = sessionToken ? await affiliateFromSession(env.DB, sessionToken) : null;
    if (!aff && legacyToken) {
      aff = await env.DB
        .prepare(`SELECT id, code, name, email FROM affiliates WHERE token = ? AND status = 'active' LIMIT 1`)
        .bind(legacyToken)
        .first<{ id: number; code: string; name: string; email: string | null }>();
    }
    if (!aff) return Response.json({ ok: false, error: "not found" }, { status: 401 });

    const code = aff.code;
    const origin = url.origin.replace(/^http:/, "https:");

    const clicks = await env.DB.prepare(`SELECT COUNT(*) AS c FROM ref_hits WHERE code = ?`)
      .bind(code)
      .first<{ c: number }>();

    // Their own referrals, with what actually happened to each one. They
    // introduced these businesses themselves, so there is nothing to hide —
    // but the query is scoped to their code and can never return anyone else's.
    const referrals = await env.DB.prepare(
      `SELECT id, name, industry, status, converted_at, created_at
         FROM leads WHERE ref_code = ? ORDER BY id DESC LIMIT 100`
    )
      .bind(code)
      .all();

    const earningsRows = await env.DB.prepare(
      `SELECT status, SUM(amount_inr) AS total FROM commissions WHERE affiliate_code = ? GROUP BY status`
    )
      .bind(code)
      .all<{ status: string; total: number }>();
    const earnings = { pending: 0, approved: 0, paid: 0 };
    for (const r of earningsRows.results ?? []) {
      if (r.status in earnings) earnings[r.status as keyof typeof earnings] = r.total ?? 0;
    }

    const ledger = await env.DB.prepare(
      `SELECT c.period_month, c.rate, c.amount_inr, c.status, c.created_at, l.name AS customer
         FROM commissions c LEFT JOIN leads l ON l.id = c.lead_id
        WHERE c.affiliate_code = ? ORDER BY c.id DESC LIMIT 50`
    )
      .bind(code)
      .all();

    const converted = await env.DB.prepare(
      `SELECT COUNT(*) AS c FROM leads WHERE ref_code = ? AND converted_at IS NOT NULL`
    )
      .bind(code)
      .first<{ c: number }>();

    const rates = await getRates(env.DB);

    return Response.json({
      ok: true,
      affiliate: {
        name: aff.name,
        code,
        email: aff.email,
        shareUrl: `${origin}/?ref=${code}`,
      },
      clicks: clicks?.c ?? 0,
      leads: (referrals.results ?? []).length,
      conversions: converted?.c ?? 0,
      earnings,
      referrals: referrals.results ?? [],
      ledger: ledger.results ?? [],
      rates,
    });
  } catch {
    return Response.json({ ok: false, error: "server" }, { status: 500 });
  }
};
