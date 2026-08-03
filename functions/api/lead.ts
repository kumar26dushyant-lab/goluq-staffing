/// <reference types="@cloudflare/workers-types" />

import { evoEnabled, sendText, type EvoEnv } from "../lib/evolution";
import { getOwnerWhatsapp } from "../lib/settings";

interface Env extends EvoEnv {
  DB: D1Database;
}

const ROLE_LABEL: Record<string, string> = {
  voice: "Digital Voice Calling Employee",
  support: "Digital Customer Support Employee",
  sales: "Digital Sales Employee",
  reception: "Digital Receptionist",
  workforce: "Complete Digital Workforce",
};
const INDUSTRY_LABEL: Record<string, string> = {
  clinic: "Clinics & Hospitals",
  diagnostic: "Diagnostic Centers",
  coaching: "Coaching Institutes",
  ca: "CA & Accounting Firms",
  travel: "Tours, Travel & Cab Services",
};

/**
 * Lead capture + the real lead engine (BUILD_SPEC §10, extended). Saves to D1,
 * then — best-effort, non-blocking — sends WhatsApp via the shared Evolution
 * server: (1) an alert to the owner, (2) an instant auto-reply to the customer.
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  try {
    const body = await request.json<Record<string, unknown>>();
    const name = String(body.name ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const email = body.email ? String(body.email).trim() : null;
    const message = body.message ? String(body.message).trim() : null;
    const role = body.role ? String(body.role) : null;
    const industry = body.industry ? String(body.industry) : null;
    const crossSell = Array.isArray(body.crossSell) ? (body.crossSell as string[]) : [];
    const wantsTraining = body.wantsTraining ? 1 : 0;
    const ref = body.ref ? String(body.ref) : null;
    // International enquiries (the /build/global page) carry E.164 numbers, not
    // Indian 10-digit mobiles, so they validate on a different rule.
    const intl = body.intl === true;

    const phoneOk = intl
      ? /^\+?[1-9]\d{7,14}$/.test(phone.replace(/[\s-]/g, ""))
      : /^[6-9]\d{9}$/.test(phone);
    if (!name || !phoneOk) {
      return Response.json({ ok: false, error: "name & valid phone required" }, { status: 400 });
    }

    // Attribution — which session/source produced this lead (see lib/track.ts).
    const sessionId = body.session_id ? String(body.session_id).slice(0, 40) : null;
    const source = body.source ? String(body.source).slice(0, 80) : null;
    const landing = body.landing ? String(body.landing).slice(0, 200) : null;

    await env.DB.prepare(
      `INSERT INTO leads (name, phone, email, message, role, industry, cross_sell, wants_training, ref_code, created_at,
                          followup_stage, next_followup_at, opted_out, status, session_id, source, landing)
       VALUES (?,?,?,?,?,?,?,?,?,datetime('now'),
               0, datetime('now','+3 days'), 0, 'new', ?,?,?)`
    )
      .bind(
        name, phone, email, message, role, industry, JSON.stringify(crossSell), wantsTraining, ref,
        sessionId, source, landing
      )
      .run();

    // Fire WhatsApp notifications without blocking the response.
    if (evoEnabled(env)) {
      const roleLabel = role ? ROLE_LABEL[role] ?? role : "Digital Employee";
      const indLabel = industry ? INDUSTRY_LABEL[industry] ?? industry : "—";

      const customerMsg =
        `Hi ${name}! 👋 Thanks for trying GoLuQ.\n\n` +
        `We've received your request for a *${roleLabel}* for your business. ` +
        `Our team will reach out right here on WhatsApp shortly to set up your free trial.\n\n` +
        `— Team GoLuQ`;

      const ownerMsg =
        `🆕 *New GoLuQ lead*\n` +
        `Name: ${name}\n` +
        `Phone: ${intl ? phone : `+91 ${phone}`}\n` +
        `Worker: ${roleLabel}\n` +
        `Industry: ${indLabel}\n` +
        `Wants training: ${wantsTraining ? "Yes" : "No"}\n` +
        (crossSell.length ? `Also wants: ${crossSell.join(", ")}\n` : "") +
        (email ? `Email: ${email}\n` : "") +
        (ref ? `Referred by: ${ref}\n` : "") +
        (message ? `\nNote: ${message}` : "");

      // The Evolution instance is provisioned for Indian numbers — don't push an
      // auto-reply at an arbitrary international number; just alert the owner.
      const tasks: Promise<unknown>[] = intl ? [] : [sendText(env, phone, customerMsg)];
      const owner = await getOwnerWhatsapp(env.DB, env);
      if (owner) tasks.push(sendText(env, owner, ownerMsg));
      context.waitUntil(Promise.allSettled(tasks));
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: "server" }, { status: 500 });
  }
};
