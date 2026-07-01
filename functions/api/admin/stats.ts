/// <reference types="@cloudflare/workers-types" />

import { checkAdmin, unauthorized } from "../../lib/admin";
import { evoEnabled, connectionState, type EvoEnv } from "../../lib/evolution";
import { geminiEnabled, type GeminiEnv } from "../../lib/gemini";
import { getOwnerWhatsapp, followupsEnabled } from "../../lib/settings";

interface Env extends EvoEnv, GeminiEnv {
  DB: D1Database;
  ADMIN_SECRET: string;
}

/** Admin overview: headline counts + config/connection status. */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!checkAdmin(request, env)) return unauthorized();

  const one = async (sql: string) =>
    (await env.DB.prepare(sql).first<{ c: number }>("c")) ?? 0;

  const total = await one("SELECT COUNT(*) AS c FROM leads");
  const today = await one("SELECT COUNT(*) AS c FROM leads WHERE date(created_at)=date('now')");
  const week = await one("SELECT COUNT(*) AS c FROM leads WHERE created_at >= datetime('now','-7 days')");
  const optedOut = await one("SELECT COUNT(*) AS c FROM leads WHERE opted_out=1");
  const affiliates = await one("SELECT COUNT(*) AS c FROM affiliates");
  const clicks = await one("SELECT COUNT(*) AS c FROM ref_hits");
  const trainingWanted = await one("SELECT COUNT(*) AS c FROM leads WHERE wants_training=1");

  const byStatusRows = await env.DB.prepare(
    "SELECT COALESCE(status,'new') AS status, COUNT(*) AS c FROM leads GROUP BY status"
  ).all<{ status: string; c: number }>();
  const byStatus: Record<string, number> = {};
  for (const r of byStatusRows.results ?? []) byStatus[r.status] = r.c;

  let waState = "not_configured";
  if (evoEnabled(env)) {
    const s = await connectionState(env);
    waState = s?.instance?.state || s?.state || "unknown";
  }

  return Response.json({
    ok: true,
    leads: { total, today, week, optedOut, trainingWanted },
    byStatus,
    affiliates,
    clicks,
    wa: { state: waState, configured: evoEnabled(env) },
    config: {
      gemini: geminiEnabled(env),
      evolution: evoEnabled(env),
      ownerSet: Boolean(await getOwnerWhatsapp(env.DB, env)),
      followups: await followupsEnabled(env.DB),
    },
  });
};
