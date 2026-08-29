/// <reference types="@cloudflare/workers-types" />

import { customerFromRequest, notLoggedIn, STAGES } from "../../lib/portal";

interface Env {
  DB: D1Database;
}

/**
 * Everything the logged-in customer is allowed to see about their own work.
 *
 * Every query is scoped by `customer_id` from the SESSION, never from anything
 * the browser sent — that is the whole security model of the portal, so it is
 * worth stating: there is no code path here where a project id from the request
 * is trusted without also matching the session's customer.
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const me = await customerFromRequest(env.DB, request);
  if (!me) return notLoggedIn();

  const projects = await env.DB.prepare(
    `SELECT id, title, service_id, stage, status, price_inr, paid_inr, target_date, created_at, updated_at
       FROM projects WHERE customer_id = ? ORDER BY id DESC`
  )
    .bind(me.id)
    .all<Record<string, unknown>>();

  const rows = projects.results || [];
  const ids = rows.map((r) => Number(r.id));

  // One query each for updates and files rather than one per project — a
  // customer with a dozen projects should not cost a dozen round trips.
  const inList = ids.length ? ids.map(() => "?").join(",") : "NULL";
  const events = ids.length
    ? (
        await env.DB.prepare(
          `SELECT project_id, stage, note, created_at FROM project_events
            WHERE project_id IN (${inList}) AND visible = 1
            ORDER BY id DESC`
        )
          .bind(...ids)
          .all<Record<string, unknown>>()
      ).results || []
    : [];
  const files = ids.length
    ? (
        await env.DB.prepare(
          `SELECT project_id, label, url, created_at FROM project_files
            WHERE project_id IN (${inList}) ORDER BY id DESC`
        )
          .bind(...ids)
          .all<Record<string, unknown>>()
      ).results || []
    : [];

  return Response.json({
    ok: true,
    stages: STAGES,
    customer: me,
    projects: rows.map((p) => ({
      ...p,
      events: events.filter((e) => Number(e.project_id) === Number(p.id)),
      files: files.filter((f) => Number(f.project_id) === Number(p.id)),
    })),
  });
};

/**
 * POST { projectId, note } — the customer adds a note to their own project.
 *
 * This is how requirements arrive after kickoff: a written trail on the project
 * itself, rather than a detail buried in a WhatsApp thread that nobody can find
 * when it matters.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const me = await customerFromRequest(env.DB, request);
  if (!me) return notLoggedIn();
  try {
    const b = await request.json<{ projectId?: number; note?: string }>();
    const note = String(b.note || "").trim().slice(0, 4000);
    if (!note) return Response.json({ ok: false, error: "empty" }, { status: 400 });

    // Ownership is proven here, not assumed from the id in the request.
    const own = await env.DB.prepare("SELECT id FROM projects WHERE id = ? AND customer_id = ?")
      .bind(Number(b.projectId), me.id)
      .first<{ id: number }>();
    if (!own) return Response.json({ ok: false, error: "not_found" }, { status: 404 });

    await env.DB.prepare(
      `INSERT INTO project_events (project_id, stage, note, author, visible, created_at)
       VALUES (?, NULL, ?, 'customer', 1, datetime('now'))`
    )
      .bind(own.id, note)
      .run();
    await env.DB.prepare("UPDATE projects SET updated_at = datetime('now') WHERE id = ?")
      .bind(own.id)
      .run();

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: "server" }, { status: 500 });
  }
};
