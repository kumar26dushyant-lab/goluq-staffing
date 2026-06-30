/// <reference types="@cloudflare/workers-types" />

import { evoEnabled, sendText, type EvoEnv } from "../../lib/evolution";
import { geminiEnabled, geminiText, type GeminiEnv } from "../../lib/gemini";

interface Env extends EvoEnv, GeminiEnv {
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

function template(stage: number, name: string, role: string): string {
  const r = role || "Digital Employee";
  const lines = [
    `Hi ${name} 😊 Just checking in — did you get a chance to think about your free GoLuQ trial? Your ${r} can start in a day. Happy to set it up whenever you're ready.\n\n(Reply STOP anytime to not get these.)`,
    `Hi ${name}, your ${r} works 24×7 with zero salary. Want me to book your free trial this week?`,
    `Hi ${name}, a quick nudge 🙏 — many owners save hours every day with this. Shall we get you started, no cost to try?`,
    `Hi ${name}, last gentle reminder — your free GoLuQ trial is still open. Reply YES and I'll set it up. Either way, wishing your business well! 🙏`,
  ];
  return lines[Math.min(stage, lines.length - 1)];
}

async function leadMessage(env: Env, stage: number, name: string, role: string, industry: string): Promise<string> {
  if (geminiEnabled(env)) {
    const prompt =
      `Write ONE short, warm WhatsApp follow-up (max 2 sentences, friendly Indian tone, ` +
      `you may mix light Hindi) to ${name}, a business owner in "${industry || "their industry"}" ` +
      `who watched a demo of a ${role} (a 24x7 digital worker) but hasn't booked the free trial yet. ` +
      `This is gentle touch #${stage + 1} of 4 — do NOT be pushy. Encourage a free trial. ` +
      `No emojis spam (one is fine). Do not mention you are an AI. Plain text only.`;
    const out = await geminiText(env, prompt, 120);
    if (out) return out + (stage === 0 ? "\n\n(Reply STOP anytime to not get these.)" : "");
  }
  return template(stage, name, role);
}

/**
 * Daily cron: send due soft follow-ups (BUILD: B2). Trigger this once a day from
 * the Oracle VM (`curl`) or a Cloudflare Cron worker. Gated by ?secret=ADMIN_SECRET.
 * Skips opted-out leads; stops after the day-12 touch.
 */
export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (new URL(request.url).searchParams.get("secret") !== env.ADMIN_SECRET) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!evoEnabled(env)) {
    return Response.json({ ok: false, error: "evolution_not_configured" }, { status: 503 });
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

  for (const lead of rows) {
    const stage = lead.followup_stage;
    const roleLabel = lead.role ? ROLE_LABEL[lead.role] ?? lead.role : "Digital Employee";

    // 1) soft touch to the lead
    const msg = await leadMessage(env, stage, lead.name, roleLabel, lead.industry ?? "");
    await sendText(env, lead.phone, msg);

    // 2) soft reminder to the owner
    if (env.OWNER_WHATSAPP) {
      await sendText(
        env,
        env.OWNER_WHATSAPP,
        `🔔 Follow-up #${stage + 1} sent to ${lead.name} (+91 ${lead.phone}) · ${roleLabel}` +
          `${lead.industry ? " · " + lead.industry : ""}. A personal call from you helps.`
      );
    }

    // 3) advance the schedule (or finish after day 12)
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
  }

  return Response.json({ ok: true, processed, found: rows.length });
};
