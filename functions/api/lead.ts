/// <reference types="@cloudflare/workers-types" />

import { evoEnabled, sendText, type EvoEnv } from "../lib/evolution";

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

    if (!name || !/^[6-9]\d{9}$/.test(phone)) {
      return Response.json({ ok: false, error: "name & valid phone required" }, { status: 400 });
    }

    await env.DB.prepare(
      `INSERT INTO leads (name, phone, email, message, role, industry, cross_sell, wants_training, ref_code, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))`
    )
      .bind(name, phone, email, message, role, industry, JSON.stringify(crossSell), wantsTraining, ref)
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
        `Phone: +91 ${phone}\n` +
        `Worker: ${roleLabel}\n` +
        `Industry: ${indLabel}\n` +
        `Wants training: ${wantsTraining ? "Yes" : "No"}\n` +
        (crossSell.length ? `Also wants: ${crossSell.join(", ")}\n` : "") +
        (email ? `Email: ${email}\n` : "") +
        (ref ? `Referred by: ${ref}\n` : "") +
        (message ? `\nNote: ${message}` : "");

      const tasks: Promise<unknown>[] = [sendText(env, phone, customerMsg)];
      if (env.OWNER_WHATSAPP) tasks.push(sendText(env, env.OWNER_WHATSAPP, ownerMsg));
      context.waitUntil(Promise.allSettled(tasks));
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: "server" }, { status: 500 });
  }
};
