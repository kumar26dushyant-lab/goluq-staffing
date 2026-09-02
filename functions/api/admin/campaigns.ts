/// <reference types="@cloudflare/workers-types" />

import { checkAdmin, unauthorized } from "../../lib/admin";
import { waConfig, waReady, type WaEnv } from "../../lib/whatsapp";
import { WA_TEMPLATES, sendTemplate } from "../../lib/waTemplates";

interface Env extends WaEnv {
  DB: D1Database;
  ADMIN_SECRET: string;
}

/**
 * How many go out per "send" click.
 *
 * A new WhatsApp number sits in Meta's lowest tier — a few hundred unique
 * recipients per 24 hours — and the tier only rises on consistent quality. Small
 * batches are not a technical limitation; they are how the number survives long
 * enough to be worth having. Blocks and reports cost the quality rating that
 * every other message we send depends on.
 */
const BATCH = 25;

/** Only the marketing template is legitimate for a campaign. */
const CAMPAIGN_TEMPLATES = [WA_TEMPLATES.followupNoReply];

const clip = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);

interface Filters {
  status?: string;
  industry?: string;
  sinceDays?: number;
}

/**
 * The audience, built ONLY from people who gave us their number themselves.
 *
 * `opted_out = 0` is in the query rather than applied afterwards, so there is no
 * code path in which a campaign reaches someone who asked us to stop. Anyone who
 * said STOP on WhatsApp is excluded too — that lives in chat_sessions, and
 * honouring it in one place and not the other would be worse than not honouring
 * it at all.
 */
function audienceSql(f: Filters): { sql: string; binds: unknown[] } {
  const where: string[] = [
    "l.opted_out = 0",
    "length(l.phone) >= 10",
    `NOT EXISTS (SELECT 1 FROM chat_sessions s
                  WHERE s.id = 'wa:91' || l.phone AND s.closed = 1)`,
  ];
  const binds: unknown[] = [];
  if (f.status) {
    where.push("l.status = ?");
    binds.push(f.status);
  }
  if (f.industry) {
    where.push("l.industry = ?");
    binds.push(f.industry);
  }
  if (f.sinceDays && f.sinceDays > 0) {
    where.push("l.created_at >= datetime('now', '-' || ? || ' days')");
    binds.push(f.sinceDays);
  }
  return {
    sql: `FROM leads l WHERE ${where.join(" AND ")}`,
    binds,
  };
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await checkAdmin(request, env))) return unauthorized();

  const campaigns = await env.DB.prepare(
    `SELECT * FROM campaigns ORDER BY id DESC LIMIT 40`
  ).all<Record<string, unknown>>();

  // Distinct values the owner can actually filter on, so the UI never offers a
  // filter that would match nobody.
  const industries = await env.DB.prepare(
    `SELECT DISTINCT industry FROM leads WHERE industry IS NOT NULL AND industry <> ''`
  ).all<{ industry: string }>();
  const statuses = await env.DB.prepare(
    `SELECT DISTINCT status FROM leads WHERE status IS NOT NULL AND status <> ''`
  ).all<{ status: string }>();

  return Response.json({
    ok: true,
    campaigns: campaigns.results || [],
    templates: CAMPAIGN_TEMPLATES,
    industries: (industries.results || []).map((r) => r.industry),
    statuses: (statuses.results || []).map((r) => r.status),
    batch: BATCH,
  });
};

/**
 * POST { action }
 *   preview  { filters }                       → how many, and who the first few are
 *   create   { name, topic, lang, filters }    → campaign + its recipient list
 *   send     { id }                            → send the next batch
 *   cancel   { id }
 *   targets  { id }                            → per-recipient status
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await checkAdmin(request, env))) return unauthorized();
  let b: Record<string, unknown>;
  try {
    b = await request.json<Record<string, unknown>>();
  } catch {
    return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const action = String(b.action || "");
  const filters: Filters = (b.filters as Filters) || {};

  try {
    if (action === "preview") {
      const { sql, binds } = audienceSql(filters);
      const n = await env.DB.prepare(`SELECT COUNT(*) AS c ${sql}`)
        .bind(...binds)
        .first<{ c: number }>();
      const sample = await env.DB.prepare(
        `SELECT l.name, l.phone, l.industry, l.status ${sql} ORDER BY l.id DESC LIMIT 5`
      )
        .bind(...binds)
        .all<Record<string, unknown>>();
      return Response.json({ ok: true, count: Number(n?.c || 0), sample: sample.results || [] });
    }

    if (action === "create") {
      const name = clip(b.name, 120);
      const topic = clip(b.topic, 160);
      const lang = String(b.lang) === "hi" ? "hi" : "en";
      if (!name || !topic) {
        return Response.json(
          { ok: false, error: "Give the campaign a name, and say what it is about." },
          { status: 400 }
        );
      }

      const { sql, binds } = audienceSql(filters);
      const people = await env.DB.prepare(`SELECT l.id, l.name, l.phone ${sql}`)
        .bind(...binds)
        .all<{ id: number; name: string; phone: string }>();
      const rows = people.results || [];
      if (!rows.length) {
        return Response.json({ ok: false, error: "That audience matches nobody." }, { status: 400 });
      }

      const r = await env.DB.prepare(
        `INSERT INTO campaigns (name, template, lang, topic, status, total, created_at)
         VALUES (?,?,?,?,'draft',?,datetime('now'))`
      )
        .bind(name, WA_TEMPLATES.followupNoReply, lang, topic, rows.length)
        .run();
      const id = Number((r as any)?.meta?.last_row_id || 0);

      for (const p of rows) {
        // OR IGNORE + the unique index means the same person cannot be queued
        // twice in one campaign, however the audience was assembled.
        await env.DB.prepare(
          `INSERT OR IGNORE INTO campaign_targets (campaign_id, lead_id, phone, name)
           VALUES (?,?,?,?)`
        )
          .bind(id, p.id, p.phone, p.name || "there")
          .run();
      }
      return Response.json({ ok: true, id, total: rows.length });
    }

    if (action === "cancel") {
      await env.DB.prepare(
        `UPDATE campaigns SET status = 'cancelled', finished_at = datetime('now') WHERE id = ?`
      )
        .bind(Number(b.id))
        .run();
      return Response.json({ ok: true });
    }

    if (action === "targets") {
      const rows = await env.DB.prepare(
        `SELECT name, phone, status, error, sent_at FROM campaign_targets
          WHERE campaign_id = ? ORDER BY id LIMIT 200`
      )
        .bind(Number(b.id))
        .all<Record<string, unknown>>();
      return Response.json({ ok: true, targets: rows.results || [] });
    }

    if (action === "send") {
      const id = Number(b.id);
      const cfg = await waConfig(env.DB, env);
      if (!waReady(cfg)) {
        return Response.json({ ok: false, error: "WhatsApp is not configured." });
      }
      const camp = await env.DB.prepare(`SELECT * FROM campaigns WHERE id = ?`)
        .bind(id)
        .first<{ id: number; template: string; lang: string; topic: string; status: string }>();
      if (!camp) return Response.json({ ok: false, error: "not_found" }, { status: 404 });
      if (camp.status === "cancelled") {
        return Response.json({ ok: false, error: "This campaign was cancelled." });
      }

      const batch = await env.DB.prepare(
        `SELECT id, phone, name FROM campaign_targets
          WHERE campaign_id = ? AND status = 'pending' ORDER BY id LIMIT ?`
      )
        .bind(id, BATCH)
        .all<{ id: number; phone: string; name: string }>();
      const targets = batch.results || [];

      if (!targets.length) {
        await env.DB.prepare(
          `UPDATE campaigns SET status = 'done', finished_at = datetime('now') WHERE id = ?`
        )
          .bind(id)
          .run();
        return Response.json({ ok: true, sentNow: 0, done: true });
      }

      await env.DB.prepare(`UPDATE campaigns SET status = 'sending' WHERE id = ?`).bind(id).run();

      let sentNow = 0;
      let failedNow = 0;
      for (const t of targets) {
        const res = await sendTemplate(cfg, t.phone, camp.template, camp.lang === "hi" ? "hi" : "en", [
          t.name,
          camp.topic,
        ]);
        if (res.ok) {
          await env.DB.prepare(
            `UPDATE campaign_targets SET status = 'sent', wamid = ?, sent_at = datetime('now')
              WHERE id = ?`
          )
            .bind(res.id, t.id)
            .run();
          sentNow += 1;
        } else {
          await env.DB.prepare(
            `UPDATE campaign_targets SET status = 'failed', error = ?, sent_at = datetime('now')
              WHERE id = ?`
          )
            .bind(res.error.slice(0, 300), t.id)
            .run();
          failedNow += 1;
        }
      }

      await env.DB.prepare(
        `UPDATE campaigns SET sent = sent + ?, failed = failed + ? WHERE id = ?`
      )
        .bind(sentNow, failedNow, id)
        .run();

      const left = await env.DB.prepare(
        `SELECT COUNT(*) AS c FROM campaign_targets WHERE campaign_id = ? AND status = 'pending'`
      )
        .bind(id)
        .first<{ c: number }>();
      const remaining = Number(left?.c || 0);
      if (!remaining) {
        await env.DB.prepare(
          `UPDATE campaigns SET status = 'done', finished_at = datetime('now') WHERE id = ?`
        )
          .bind(id)
          .run();
      }

      return Response.json({ ok: true, sentNow, failedNow, remaining, done: !remaining });
    }

    return Response.json({ ok: false, error: "unknown_action" }, { status: 400 });
  } catch (e) {
    console.log("campaigns failed:", String(e).slice(0, 300));
    return Response.json({ ok: false, error: "server" }, { status: 500 });
  }
};
