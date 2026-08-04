/// <reference types="@cloudflare/workers-types" />

import { checkAdmin } from "../../lib/admin";

interface Env {
  DB: D1Database;
  ADMIN_SECRET?: string;
}

/** Dotted i18n paths only — nothing exotic can be written as a key. */
const KEY_RE = /^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)*$/;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await checkAdmin(request, env))) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const rows = await env.DB.prepare(
    `SELECT key, val_en, val_hi FROM content_overrides ORDER BY key`
  ).all();
  return Response.json({ ok: true, overrides: rows.results ?? [] });
};

/**
 * Save or clear overrides. An empty string clears the key, restoring whatever
 * the shipped translation file says — so the owner can always get back to the
 * default without needing a deploy or a database edit.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await checkAdmin(request, env))) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const b = await request.json<{ rows?: { key: string; en?: string; hi?: string }[] }>();
    const rows = Array.isArray(b.rows) ? b.rows : [];
    if (!rows.length) return Response.json({ ok: false, error: "no rows" }, { status: 400 });

    for (const r of rows) {
      const key = String(r.key ?? "").trim();
      if (!KEY_RE.test(key) || key.length > 120) continue;

      const en = String(r.en ?? "").trim().slice(0, 4000);
      const hi = String(r.hi ?? "").trim().slice(0, 4000);

      if (!en && !hi) {
        await env.DB.prepare(`DELETE FROM content_overrides WHERE key = ?`).bind(key).run();
        continue;
      }
      await env.DB.prepare(
        `INSERT INTO content_overrides (key, val_en, val_hi, updated_at)
         VALUES (?,?,?,datetime('now'))
         ON CONFLICT(key) DO UPDATE SET
           val_en = excluded.val_en, val_hi = excluded.val_hi, updated_at = datetime('now')`
      )
        .bind(key, en || null, hi || null)
        .run();
    }
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
};
