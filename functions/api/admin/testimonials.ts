/// <reference types="@cloudflare/workers-types" />

import { checkAdmin, unauthorized } from "../../lib/admin";

interface Env {
  DB: D1Database;
  ADMIN_SECRET: string;
}

const clip = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);

/**
 * Testimonials — the owner's side.
 *
 * The video file itself is uploaded through a separate multipart route on the
 * server (it needs a disk), which returns a /media/… path. This handler owns
 * everything else: who said it, what they said, whether it is live.
 *
 * GET  → all rows, live or not
 * POST { action: "save", ... }   → create or update
 *      { action: "live", id, live } → show / hide
 *      { action: "delete", id }
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await checkAdmin(request, env))) return unauthorized();
  const rows = await env.DB.prepare(
    `SELECT * FROM testimonials ORDER BY sort_order, id DESC`
  ).all<Record<string, unknown>>();
  return Response.json({ ok: true, testimonials: rows.results || [] });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await checkAdmin(request, env))) return unauthorized();
  let b: Record<string, unknown>;
  try {
    b = await request.json<Record<string, unknown>>();
  } catch {
    return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const action = String(b.action || "save");

  try {
    if (action === "delete") {
      await env.DB.prepare("DELETE FROM testimonials WHERE id = ?").bind(Number(b.id)).run();
      return Response.json({ ok: true });
    }

    if (action === "live") {
      await env.DB.prepare("UPDATE testimonials SET live = ? WHERE id = ?")
        .bind(b.live ? 1 : 0, Number(b.id))
        .run();
      return Response.json({ ok: true });
    }

    const name = clip(b.name, 120);
    const quote = clip(b.quote, 600);
    if (!name || !quote) {
      return Response.json({ ok: false, error: "A name and a quote are required." }, { status: 400 });
    }
    const fields = [
      name,
      clip(b.title, 120) || null,
      clip(b.company, 160) || null,
      quote,
      clip(b.video_path, 300) || null,
      clip(b.poster_path, 300) || null,
      String(b.lang || "en") === "hi" ? "hi" : "en",
      clip(b.product, 40) || null,
      Number(b.sort_order) || 0,
    ];

    if (b.id) {
      await env.DB.prepare(
        `UPDATE testimonials SET name=?, title=?, company=?, quote=?, video_path=?, poster_path=?,
                lang=?, product=?, sort_order=? WHERE id = ?`
      )
        .bind(...fields, Number(b.id))
        .run();
      return Response.json({ ok: true, id: Number(b.id) });
    }

    const r = await env.DB.prepare(
      `INSERT INTO testimonials (name, title, company, quote, video_path, poster_path, lang, product, sort_order, live, created_at)
       VALUES (?,?,?,?,?,?,?,?,?, 0, datetime('now'))`
    )
      .bind(...fields)
      .run();
    return Response.json({ ok: true, id: Number((r as any)?.meta?.last_row_id || 0) });
  } catch (e) {
    console.log("testimonials failed:", String(e).slice(0, 200));
    return Response.json({ ok: false, error: "server" }, { status: 500 });
  }
};
