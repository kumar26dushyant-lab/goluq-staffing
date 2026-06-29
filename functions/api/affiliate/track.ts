/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
}

/**
 * Record an affiliate referral click (BUILD_SPEC §10A). Fire-and-forget: always
 * returns { ok } fast and never blocks the page. Stores code + time only (no PII).
 * Only logs a hit if the code maps to an active affiliate.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const { code } = await request.json<{ code?: string }>();
    if (code) {
      const aff = await env.DB.prepare(
        `SELECT 1 FROM affiliates WHERE code = ? AND status = 'active' LIMIT 1`
      )
        .bind(code)
        .first();
      if (aff) {
        await env.DB.prepare(
          `INSERT INTO ref_hits (code, created_at) VALUES (?, datetime('now'))`
        )
          .bind(code)
          .run();
      }
    }
  } catch {
    // swallow — tracking must never surface an error to the page
  }
  return Response.json({ ok: true });
};
