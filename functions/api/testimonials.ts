/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
}

/** Public: the testimonials the owner has switched on, in display order. */
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const rows = await env.DB.prepare(
      `SELECT id, name, title, company, quote, video_path, poster_path, lang, product
         FROM testimonials WHERE live = 1 ORDER BY sort_order, id DESC LIMIT 12`
    ).all<Record<string, unknown>>();
    return Response.json(
      { ok: true, testimonials: rows.results || [] },
      { headers: { "cache-control": "public, max-age=300" } }
    );
  } catch {
    // A missing table must never take the homepage down with it.
    return Response.json({ ok: true, testimonials: [] });
  }
};
