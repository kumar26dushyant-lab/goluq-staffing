/// <reference types="@cloudflare/workers-types" />

import { waConfig, waReady, type WaEnv } from "../../lib/whatsapp";
import { WA_TEMPLATES, sendTemplate } from "../../lib/waTemplates";
import { mailEnabled, sendMail, type MailEnv } from "../../lib/mailer";
import { getOwnerEmail, followupsEnabled } from "../../lib/settings";

interface Env extends WaEnv, MailEnv {
  DB: D1Database;
  ADMIN_SECRET: string;
}

interface LeadRow {
  id: number;
  name: string;
  phone: string;
  role: string | null;
  industry: string | null;
  followup_stage: number;
  created_at: string;
}

// Soft cadence: gentle touches on days 3, 5, 7, 12 — then stop.
const DAYS = [3, 5, 7, 12];

const ROLE_LABEL: Record<string, string> = {
  voice: "Digital Voice Calling Employee",
  support: "Digital Customer Support Employee",
  sales: "Digital Sales Employee",
  reception: "Digital Receptionist",
  workforce: "Complete Digital Workforce",
};

/**
 * Daily cron: send the follow-ups that are due. Gated by ?secret=ADMIN_SECRET.
 * Skips opted-out leads; stops after the day-12 touch.
 *
 * These go out as the approved `followup_no_reply` TEMPLATE, because a follow-up
 * by definition reaches someone whose 24-hour window closed days ago, and only a
 * template crosses that line. The previous version composed a fresh message with
 * Gemini, which cannot work here at all — template text is fixed at approval
 * time and variables are the only thing we control. That freedom was never real.
 */
export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (new URL(request.url).searchParams.get("secret") !== env.ADMIN_SECRET) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const cfg = await waConfig(env.DB, env);
  if (!waReady(cfg)) {
    return Response.json({ ok: false, error: "whatsapp_not_configured" }, { status: 503 });
  }
  if (!(await followupsEnabled(env.DB))) {
    return Response.json({ ok: true, disabled: true, processed: 0, skipped: 0, found: 0 });
  }

  const due = await env.DB.prepare(
    `SELECT id, name, phone, role, industry, followup_stage, created_at
     FROM leads
     WHERE opted_out = 0 AND next_followup_at IS NOT NULL
       AND next_followup_at <= datetime('now') AND followup_stage < 4
     ORDER BY next_followup_at ASC LIMIT 40`
  ).all<LeadRow>();

  const rows = due.results ?? [];
  let processed = 0;
  let skipped = 0;
  const sentTo: string[] = [];
  const failures: string[] = [];

  for (const lead of rows) {
    const stage = lead.followup_stage;
    const roleLabel = lead.role ? ROLE_LABEL[lead.role] ?? lead.role : "a Digital Employee";

    // {{1}} their name · {{2}} what they asked about.
    const sent = await sendTemplate(cfg, lead.phone, WA_TEMPLATES.followupNoReply, "en", [
      lead.name,
      roleLabel,
    ]);

    // Delivery failure must NOT advance the schedule. Otherwise a lead burns
    // through all four touches, receives nothing, and ends up marked 'done' —
    // which is how this engine quietly did nothing for months.
    if (!sent.ok) {
      skipped += 1;
      failures.push(`${lead.name}: ${sent.error}`);
      continue;
    }

    const nextStage = stage + 1;
    if (nextStage < DAYS.length) {
      await env.DB.prepare(
        `UPDATE leads SET followup_stage = ?, status = 'engaged',
           next_followup_at = datetime(created_at, '+' || ? || ' days')
         WHERE id = ?`
      ).bind(nextStage, DAYS[nextStage], lead.id).run();
    } else {
      await env.DB.prepare(
        `UPDATE leads SET followup_stage = ?, status = 'done', next_followup_at = NULL WHERE id = ?`
      ).bind(nextStage, lead.id).run();
    }
    processed += 1;
    sentTo.push(`${lead.name} (+${lead.phone}) · touch ${stage + 1} of 4 · ${roleLabel}`);
  }

  // One summary to the owner rather than a WhatsApp per lead: the owner's own
  // 24-hour window is closed too, so those pings could never be delivered.
  if ((processed || skipped) && mailEnabled(env)) {
    const to = await getOwnerEmail(env.DB);
    if (to) {
      const body =
        `${processed} follow-up${processed === 1 ? "" : "s"} sent today.\n\n` +
        (sentTo.length ? sentTo.join("\n") + "\n\n" : "") +
        (failures.length
          ? `Not delivered (their slot is kept and will be retried):\n${failures.join("\n")}\n\n`
          : "") +
        `A personal call from you converts far better than any of these.\n`;
      const mail = await sendMail(env, { to, subject: `GoLuQ follow-ups — ${processed} sent`, text: body });
      // sendMail reports failure in its result rather than throwing.
      if (!mail.ok) console.log("followup summary not sent:", mail.error);
    }
  }

  // `skipped` is the number that could not be delivered — those keep their slot
  // in the sequence and are retried, rather than being silently consumed.
  return Response.json({ ok: true, processed, skipped, found: rows.length });
};
