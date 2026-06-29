/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
}

/**
 * Lead capture (BUILD_SPEC §10). Same-origin Pages Function — no CORS. Stores the
 * lead in D1 including affiliate attribution (`ref`). Validates name + phone
 * server-side (never trust the client). Returns { ok }.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = await request.json<Record<string, unknown>>();
    const name = String(body.name ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const email = body.email ? String(body.email).trim() : null;
    const message = body.message ? String(body.message).trim() : null;
    const role = body.role ? String(body.role) : null;
    const industry = body.industry ? String(body.industry) : null;
    const crossSell = Array.isArray(body.crossSell) ? body.crossSell : [];
    const wantsTraining = body.wantsTraining ? 1 : 0;
    const ref = body.ref ? String(body.ref) : null;

    if (!name || !/^[6-9]\d{9}$/.test(phone)) {
      return Response.json({ ok: false, error: "name & valid phone required" }, { status: 400 });
    }

    await env.DB.prepare(
      `INSERT INTO leads (name, phone, email, message, role, industry, cross_sell, wants_training, ref_code, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))`
    )
      .bind(
        name,
        phone,
        email,
        message,
        role,
        industry,
        JSON.stringify(crossSell),
        wantsTraining,
        ref
      )
      .run();

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: "server" }, { status: 500 });
  }
};
