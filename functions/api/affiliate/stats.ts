/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
}

/** Token-gated dashboard data for one affiliate (BUILD_SPEC §10A). 404 on bad token. */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const token = new URL(request.url).searchParams.get("token") ?? "";
    if (!token) return Response.json({ ok: false, error: "no token" }, { status: 400 });

    const aff = await env.DB.prepare(
      `SELECT name, code FROM affiliates WHERE token = ? AND status = 'active' LIMIT 1`
    )
      .bind(token)
      .first<{ name: string; code: string }>();
    if (!aff) return Response.json({ ok: false, error: "not found" }, { status: 404 });

    const origin = new URL(request.url).origin;
    const code = aff.code;

    const clicks = await env.DB.prepare(`SELECT COUNT(*) AS c FROM ref_hits WHERE code = ?`).bind(code).first<{ c: number }>();
    const leads = await env.DB.prepare(`SELECT COUNT(*) AS c FROM leads WHERE ref_code = ?`).bind(code).first<{ c: number }>();
    const conv = await env.DB.prepare(
      `SELECT COUNT(DISTINCT customer_ref) AS c FROM commissions WHERE affiliate_code = ?`
    )
      .bind(code)
      .first<{ c: number }>();

    const earnRows = await env.DB.prepare(
      `SELECT status, SUM(amount_inr) AS total FROM commissions WHERE affiliate_code = ? GROUP BY status`
    )
      .bind(code)
      .all<{ status: string; total: number }>();
    const earnings = { pending: 0, approved: 0, paid: 0 } as Record<string, number>;
    for (const r of earnRows.results ?? []) earnings[r.status] = r.total ?? 0;

    const recent = await env.DB.prepare(
      `SELECT period_month, amount_inr, status, created_at FROM commissions WHERE affiliate_code = ? ORDER BY id DESC LIMIT 10`
    )
      .bind(code)
      .all();

    return Response.json({
      ok: true,
      affiliate: { name: aff.name, code, shareUrl: `${origin}/?ref=${code}` },
      clicks: clicks?.c ?? 0,
      leads: leads?.c ?? 0,
      conversions: conv?.c ?? 0,
      earnings,
      recent: recent.results ?? [],
    });
  } catch {
    return Response.json({ ok: false, error: "server" }, { status: 500 });
  }
};
