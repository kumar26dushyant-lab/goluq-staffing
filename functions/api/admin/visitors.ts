/// <reference types="@cloudflare/workers-types" />

import { checkAdmin } from "../../lib/admin";

interface Env {
  DB: D1Database;
  ADMIN_SECRET?: string;
}

const all = async <T>(db: D1Database, sql: string, ...binds: unknown[]): Promise<T[]> =>
  ((await db.prepare(sql).bind(...binds).all()).results as T[]) ?? [];

/**
 * Visitor analytics rollup for the admin cockpit. Everything is aggregate — the
 * `visits` table holds no PII to leak (see schema.sql).
 *
 * The row that actually matters commercially is `funnel`: sessions that reached
 * the build page vs sessions that converted. Raw pageview counts are vanity;
 * "how many people who saw /build left a number" is the number to run the
 * business on.
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await checkAdmin(request, env))) {
    return Response.json({ ok: false, error: "unauthorised" }, { status: 401 });
  }
  try {
    const [totals] = await all<{ views: number; sessions: number }>(
      env.DB,
      `SELECT COUNT(*) AS views, COUNT(DISTINCT session_id) AS sessions FROM visits`
    );
    const [today] = await all<{ views: number; sessions: number }>(
      env.DB,
      `SELECT COUNT(*) AS views, COUNT(DISTINCT session_id) AS sessions
       FROM visits WHERE date(created_at) = date('now')`
    );
    const [week] = await all<{ sessions: number }>(
      env.DB,
      `SELECT COUNT(DISTINCT session_id) AS sessions
       FROM visits WHERE created_at >= datetime('now','-7 days')`
    );

    const pages = await all(
      env.DB,
      `SELECT path AS k, COUNT(*) AS views, COUNT(DISTINCT session_id) AS sessions
       FROM visits GROUP BY path ORDER BY sessions DESC LIMIT 12`
    );
    const sources = await all(
      env.DB,
      `SELECT COALESCE(NULLIF(utm_source,''), NULLIF(referrer_host,''), 'direct') AS k,
              COUNT(DISTINCT session_id) AS sessions
       FROM visits GROUP BY k ORDER BY sessions DESC LIMIT 12`
    );
    const devices = await all(
      env.DB,
      `SELECT COALESCE(device,'unknown') AS k, COUNT(DISTINCT session_id) AS sessions
       FROM visits GROUP BY k ORDER BY sessions DESC`
    );
    const daily = await all(
      env.DB,
      `SELECT date(created_at) AS k, COUNT(DISTINCT session_id) AS sessions
       FROM visits WHERE created_at >= datetime('now','-14 days')
       GROUP BY k ORDER BY k`
    );

    // Funnel: reach → intent → conversion.
    const [buildViews] = await all<{ n: number }>(
      env.DB,
      `SELECT COUNT(DISTINCT session_id) AS n FROM visits WHERE path LIKE '/build%'`
    );
    const [leadSessions] = await all<{ n: number }>(
      env.DB,
      `SELECT COUNT(*) AS n FROM leads WHERE session_id IS NOT NULL AND session_id != ''`
    );
    const [leadTotal] = await all<{ n: number }>(env.DB, `SELECT COUNT(*) AS n FROM leads`);

    return Response.json({
      ok: true,
      totals: {
        views: totals?.views ?? 0,
        sessions: totals?.sessions ?? 0,
        todayViews: today?.views ?? 0,
        todaySessions: today?.sessions ?? 0,
        weekSessions: week?.sessions ?? 0,
      },
      funnel: {
        sessions: totals?.sessions ?? 0,
        buildSessions: buildViews?.n ?? 0,
        leads: leadTotal?.n ?? 0,
        attributedLeads: leadSessions?.n ?? 0,
      },
      pages,
      sources,
      devices,
      daily,
    });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
};
