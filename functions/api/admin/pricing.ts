/// <reference types="@cloudflare/workers-types" />

import { checkAdmin } from "../../lib/admin";
import { getPricing, TIER_LABELS } from "../../lib/pricing";

interface Env {
  DB: D1Database;
  ADMIN_SECRET?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!checkAdmin(request, env)) {
    return Response.json({ ok: false, error: "unauthorised" }, { status: 401 });
  }
  const rows = await getPricing(env.DB);
  return Response.json({ ok: true, pricing: rows, labels: TIER_LABELS });
};

/**
 * Update one or more tiers. Accepts a partial list so the cockpit can save a
 * single row without resubmitting the whole table.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!checkAdmin(request, env)) {
    return Response.json({ ok: false, error: "unauthorised" }, { status: 401 });
  }
  try {
    const body = await request.json<{ rows?: Record<string, unknown>[] }>();
    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (rows.length === 0) return Response.json({ ok: false, error: "no rows" }, { status: 400 });

    await getPricing(env.DB); // ensure seeded before updating

    for (const r of rows) {
      const id = String(r.id ?? "");
      if (!id) continue;
      const price = Math.max(0, Math.round(Number(r.price_inr) || 0));
      const offerPriceRaw = Number(r.offer_price_inr);
      const offerPrice = Number.isFinite(offerPriceRaw) && offerPriceRaw > 0
        ? Math.round(offerPriceRaw)
        : null;
      await env.DB.prepare(
        `UPDATE pricing
            SET price_inr = ?, recurring = ?, lead_time = ?, enabled = ?,
                offer_label = ?, offer_price_inr = ?, updated_at = datetime('now')
          WHERE id = ?`
      )
        .bind(
          price,
          r.recurring ? 1 : 0,
          String(r.lead_time ?? "").slice(0, 60),
          r.enabled === false ? 0 : 1,
          r.offer_label ? String(r.offer_label).slice(0, 80) : null,
          offerPrice,
          id
        )
        .run();
    }
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
};
