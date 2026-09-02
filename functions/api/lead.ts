/// <reference types="@cloudflare/workers-types" />

import { waConfig, waReady, type WaEnv } from "../lib/whatsapp";
import { WA_TEMPLATES, sendTemplate } from "../lib/waTemplates";
import { getOwnerEmail } from "../lib/settings";
import { mailEnabled, sendMail, type MailEnv } from "../lib/mailer";

interface Env extends WaEnv, MailEnv {
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

    // Email the owner. This is the alert channel that actually works today:
    // the WhatsApp instance is pending Meta review, and a lead nobody is told
    // about is a lead lost. Non-blocking — a mail failure must never fail the
    // form submission the visitor is waiting on.
    context.waitUntil(
      (async () => {
        try {
          if (!mailEnabled(env)) return;
          const to = await getOwnerEmail(env.DB);
          if (!to) return;

          const roleLabel = role ? ROLE_LABEL[role] ?? role : "—";
          const indLabel = industry ? INDUSTRY_LABEL[industry] ?? industry : "—";
          const dial = intl ? phone : `91${phone}`;

          // sendMail RETURNS { ok, error } — it does not throw. Awaiting it
          // proves nothing, so the result must be checked explicitly.
          const sent = await sendMail(env, {
            to,
            subject: `New GoLuQ lead — ${name}${industry ? " · " + indLabel : ""}`,
            replyTo: email || undefined,
            text: [
              `${name} just enquired on goluq.com.`,
              "",
              `Phone:    ${intl ? phone : "+91 " + phone}`,
              `WhatsApp: https://wa.me/${dial}`,
              email ? `Email:    ${email}` : "",
              `Wants:    ${roleLabel}`,
              `Industry: ${indLabel}`,
              wantsTraining ? "Asked for the training walkthrough." : "",
              crossSell.length ? `Also interested in: ${crossSell.join(", ")}` : "",
              ref ? `Referred by partner: ${ref}` : "",
              source ? `Came from: ${source}${landing ? " → " + landing : ""}` : "",
              "",
              message ? `--- What they wrote ---
${message}` : "",
              "",
              "Open the cockpit: https://goluq.com/admin",
            ]
              .filter(Boolean)
              .join("\n"),
          });
          if (!sent.ok) console.log("lead alert email rejected:", sent.error);
        } catch (err) {
          // Log rather than swallow: a silently broken alert channel is
          // indistinguishable from a working one, which is how leads go
          // unnoticed. It still never affects the visitor's submission.
          console.log("lead alert email failed:", String(err));
        }
      })()
    );

    // Confirm on WhatsApp that a person has the enquiry, without blocking the
    // response. This goes as the approved `enquiry_received` TEMPLATE: the
    // person has almost certainly never messaged our business number, so their
    // 24-hour service window was never open and free text cannot be delivered.
    const cfg = await waConfig(env.DB, env);
    if (waReady(cfg)) {
      const roleLabel = role ? ROLE_LABEL[role] ?? role : "a Digital Employee";
      context.waitUntil(
        (async () => {
          const sent = await sendTemplate(cfg, phone, WA_TEMPLATES.enquiryReceived, "en", [
            name,
            roleLabel,
          ]);
          // Never throws; the result is the only place failure is visible.
          if (!sent.ok) console.log("enquiry_received not delivered:", sent.error);
        })()
      );
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: "server" }, { status: 500 });
  }
};
