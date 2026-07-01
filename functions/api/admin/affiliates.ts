/// <reference types="@cloudflare/workers-types" />

import { checkAdmin, unauthorized } from "../../lib/admin";

interface Env {
  DB: D1Database;
  ADMIN_SECRET: string;
}

/** Admin: affiliates with click/lead/earning rollups. */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!checkAdmin(request, env)) return unauthorized();
  const rows = await env.DB.prepare(
    `SELECT a.id, a.code, a.name, a.phone, a.email, a.city, a.upi_id, a.status, a.created_at,
            (SELECT COUNT(*) FROM ref_hits h WHERE h.code = a.code) AS clicks,
            (SELECT COUNT(*) FROM leads l WHERE l.ref_code = a.code) AS leads,
            (SELECT COALESCE(SUM(amount_inr),0) FROM commissions c WHERE c.affiliate_code = a.code) AS earnings
     FROM affiliates a ORDER BY a.id DESC LIMIT 200`
  ).all<Record<string, unknown>>();
  return Response.json({ ok: true, affiliates: rows.results ?? [] });
};
