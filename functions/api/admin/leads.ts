/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
  ADMIN_SECRET: string;
}

/** Admin: recent leads (token-gated via ?secret=). No customer login anywhere. */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (new URL(request.url).searchParams.get("secret") !== env.ADMIN_SECRET) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const rows = await env.DB.prepare(
      `SELECT id, name, phone, email, role, industry, cross_sell, wants_training, ref_code, created_at
       FROM leads ORDER BY id DESC LIMIT 100`
    ).all();
    const count = await env.DB.prepare(`SELECT COUNT(*) AS c FROM leads`).first<{ c: number }>();
    return Response.json({ ok: true, total: count?.c ?? 0, leads: rows.results ?? [] });
  } catch {
    return Response.json({ ok: false, error: "server" }, { status: 500 });
  }
};
