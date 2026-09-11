/// <reference types="@cloudflare/workers-types" />

import { checkAdmin, unauthorized } from "../../lib/admin";

interface Env {
  DB: D1Database;
  ADMIN_SECRET: string;
}

const STATUSES = ["new", "contacted", "quoted", "won", "lost"];

/** GET → briefs (latest 200). POST { action: "status", id, status } | { action: "note", id, note } */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await checkAdmin(request, env))) return unauthorized();
  const rows = await env.DB.prepare("SELECT * FROM briefs ORDER BY id DESC LIMIT 200").all<any>();
  const parse = (s: string) => { try { return JSON.parse(s); } catch { return null; } };
  return Response.json({
    ok: true,
    briefs: (rows.results ?? []).map((r) => ({ ...r, departments: parse(r.departments) || [], history: parse(r.history) || [], brd: parse(r.brd) })),
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await checkAdmin(request, env))) return unauthorized();
  const b = await request.json<{ action?: string; id?: number; status?: string; note?: string }>().catch(() => ({} as any));
  const id = Number(b.id || 0);
  if (!id) return Response.json({ ok: false, error: "id" }, { status: 400 });
  if (b.action === "status" && STATUSES.includes(String(b.status))) {
    await env.DB.prepare("UPDATE briefs SET status = ?, updated_at = datetime('now') WHERE id = ?").bind(String(b.status), id).run();
    return Response.json({ ok: true });
  }
  if (b.action === "note") {
    await env.DB.prepare("UPDATE briefs SET note = ?, updated_at = datetime('now') WHERE id = ?").bind(String(b.note || "").slice(0, 4000), id).run();
    return Response.json({ ok: true });
  }
  return Response.json({ ok: false, error: "unknown action" }, { status: 400 });
};
