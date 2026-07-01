/// <reference types="@cloudflare/workers-types" />

import { checkAdmin, unauthorized } from "../../lib/admin";

interface Env {
  DB: D1Database;
  ADMIN_SECRET: string;
}

/** Admin: leads list with optional search (?q=) + status filter (?status=) +
 *  CSV export (?format=csv). Token-gated. */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!checkAdmin(request, env)) return unauthorized();
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  const status = (url.searchParams.get("status") || "").trim();
  const format = url.searchParams.get("format") || "json";

  const where: string[] = [];
  const binds: unknown[] = [];
  if (q) {
    where.push("(name LIKE ? OR phone LIKE ? OR email LIKE ?)");
    binds.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (status) {
    where.push("COALESCE(status,'new') = ?");
    binds.push(status);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const limit = format === "csv" ? 5000 : 200;

  const rows = await env.DB.prepare(
    `SELECT id, name, phone, email, message, role, industry, cross_sell, wants_training,
            ref_code, status, opted_out, followup_stage, last_inbound_at, created_at
     FROM leads ${whereSql} ORDER BY id DESC LIMIT ${limit}`
  )
    .bind(...binds)
    .all<Record<string, unknown>>();
  const leads = rows.results ?? [];

  if (format === "csv") {
    const cols = ["id", "created_at", "name", "phone", "email", "role", "industry", "wants_training", "status", "opted_out", "ref_code", "message"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [cols.join(","), ...leads.map((l) => cols.map((c) => esc(l[c])).join(","))].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="goluq-leads.csv"`,
      },
    });
  }

  const total = await env.DB.prepare(`SELECT COUNT(*) AS c FROM leads ${whereSql}`).bind(...binds).first<{ c: number }>("c");
  return Response.json({ ok: true, total: total ?? 0, leads });
};
