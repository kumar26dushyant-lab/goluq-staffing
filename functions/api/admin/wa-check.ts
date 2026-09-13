/// <reference types="@cloudflare/workers-types" />

import { checkAdmin, unauthorized } from "../../lib/admin";
import {
  waConfig, waReady, waSendText, waNormalize, waSubscribedApps, waSubscribe, type WaEnv,
} from "../../lib/whatsapp";

interface Env extends WaEnv {
  DB: D1Database;
  ADMIN_SECRET: string;
}

const GRAPH = "https://graph.facebook.com/v21.0";

/**
 * "Is my WhatsApp actually connected?" — answered without guesswork.
 *
 * Asks Meta who this phone number ID belongs to, using the stored token. That
 * single call proves the phone number ID and the access token are both real and
 * paired, which is the half of the setup a person cannot check by looking at the
 * site. The other half (the webhook) can only be proven by a real message, so
 * the reply says so plainly rather than implying a green tick means everything.
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await checkAdmin(request, env))) return unauthorized();
  const cfg = await waConfig(env.DB, env);

  const checklist = {
    phoneNumberId: Boolean(cfg.phoneNumberId),
    accessToken: Boolean(cfg.accessToken),
    verifyToken: Boolean(cfg.verifyToken),
    appSecret: Boolean(cfg.appSecret),
  };

  if (!waReady(cfg)) {
    return Response.json({
      ok: false,
      checklist,
      error: "Phone number ID and access token are both needed before anything can be checked.",
    });
  }

  // Has Meta EVER delivered an inbound message? This is the half that a Graph
  // call cannot answer, and the half that is usually broken: the callback URL
  // verifies happily while messages are never forwarded. "Never" here, after a
  // real test message, means the problem is on Meta's side of the wire, not ours.
  const inbound = await inboundHealth(env.DB);
  // The account↔app link, which no amount of app-side configuration reveals.
  // Reported even with no account id stored, so the panel can say what is
  // missing — silently hiding the card is how this check went unnoticed while
  // the account sat subscribed to no app at all.
  const subscription = await waSubscribedApps(cfg);

  try {
    const res = await fetch(
      `${GRAPH}/${cfg.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,name_status,code_verification_status,platform_type`,
      { headers: { Authorization: `Bearer ${cfg.accessToken}` } }
    );
    const text = await res.text();
    let j: any = {};
    try {
      j = JSON.parse(text);
    } catch {
      /* fall through to the raw text below */
    }
    if (!res.ok) {
      // Meta's own message is far more useful than anything invented here —
      // it names the expired token or the wrong id directly.
      return Response.json({
        ok: false,
        checklist,
        inbound,
        subscription,
        error: j?.error?.message || `Meta refused the request (HTTP ${res.status}).`,
      });
    }
    return Response.json({
      ok: true,
      checklist,
      inbound,
      subscription,
      number: j?.display_phone_number || "",
      name: j?.verified_name || "",
      quality: j?.quality_rating || "",
      // DECLINED here is why customers may see a bare number instead of the
      // business name. It does not stop messages; it only weakens them.
      nameStatus: j?.name_status || "",
      verification: j?.code_verification_status || "",
      platform: j?.platform_type || "",
    });
  } catch (e) {
    return Response.json({ ok: false, checklist, inbound, subscription, error: String(e).slice(0, 200) });
  }
};

/** How many inbound WhatsApp messages have reached the webhook, and when last. */
async function inboundHealth(
  db: D1Database
): Promise<{ count: number; lastAt: string | null; threads: number }> {
  try {
    const ev = await db
      .prepare("SELECT COUNT(*) AS c, MAX(created_at) AS m FROM wa_events")
      .first<{ c: number; m: string | null }>();
    const th = await db
      .prepare("SELECT COUNT(*) AS c FROM chat_sessions WHERE page = 'whatsapp'")
      .first<{ c: number }>();
    return { count: Number(ev?.c || 0), lastAt: ev?.m || null, threads: Number(th?.c || 0) };
  } catch {
    return { count: 0, lastAt: null, threads: 0 };
  }
}

/**
 * Send a real message to a number you choose, to prove sending works.
 *
 * This will fail unless that number messaged the business number within the last
 * 24 hours — Meta only allows free-form text inside that window. That is not a
 * fault to work around; it is the rule, and the error text says so.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await checkAdmin(request, env))) return unauthorized();
  const cfg = await waConfig(env.DB, env);
  if (!waReady(cfg)) {
    return Response.json({ ok: false, error: "WhatsApp is not configured yet." });
  }
  try {
    const b = await request.json<{ to?: string; action?: string; profile?: Record<string, unknown>; compliance?: Record<string, unknown> }>();

    // What a customer sees under "Business details" in WhatsApp: the public
    // profile (about, address, website) and, for India, the legal entity and
    // customer-care contacts Meta requires. Both are plain fields on the
    // phone number; both were "Not provided" until now.
    if (b.action === "profile") {
      const p = b.profile || {};
      const clip = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);
      const body: Record<string, unknown> = {
        messaging_product: "whatsapp",
        about: clip(p.about, 139) || undefined,
        address: clip(p.address, 256) || undefined,
        description: clip(p.description, 512) || undefined,
        email: clip(p.email, 128) || undefined,
        websites: [clip(p.website, 256) || "https://goluq.com"],
        vertical: clip(p.vertical, 40) || "PROF_SERVICES",
      };
      const r = await fetch(`${GRAPH}/${cfg.phoneNumberId}/whatsapp_business_profile`, {
        method: "POST", headers: { Authorization: `Bearer ${cfg.accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const j: any = await r.json().catch(() => ({}));
      return Response.json(r.ok && !j.error ? { ok: true } : { ok: false, error: String(j?.error?.error_user_msg || j?.error?.message || `http_${r.status}`) });
    }
    if (b.action === "compliance") {
      const c = b.compliance || {};
      const clip = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);
      const phoneOf = (v: unknown) => { const d = String(v ?? "").replace(/\D/g, ""); return d ? { country_code: "91", number: d.length === 12 && d.startsWith("91") ? d.slice(2) : d } : undefined; };
      const body: Record<string, unknown> = {
        messaging_product: "whatsapp",
        entity_name: clip(c.entity_name, 200),
        entity_type: clip(c.entity_type, 40) || "SOLE_PROPRIETORSHIP",
        is_registered: c.is_registered === true || c.is_registered === "1",
        customer_care_details: { email: clip(c.cc_email, 128) || undefined, phone: phoneOf(c.cc_phone), landline_number: phoneOf(c.cc_landline) },
        grievance_officer_details: { name: clip(c.go_name, 120), email: clip(c.go_email, 128) || undefined, phone: phoneOf(c.go_phone), landline_number: phoneOf(c.go_landline) },
      };
      if (c.entity_type_custom) body.entity_type_custom = clip(c.entity_type_custom, 120);
      const r = await fetch(`${GRAPH}/${cfg.phoneNumberId}/business_compliance_info`, {
        method: "POST", headers: { Authorization: `Bearer ${cfg.accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const j: any = await r.json().catch(() => ({}));
      return Response.json(r.ok && !j.error ? { ok: true } : { ok: false, error: String(j?.error?.error_user_msg || j?.error?.message || `http_${r.status}`) });
    }

    // One click for the switch that is otherwise buried: linking the WhatsApp
    // account to this app is what makes inbound messages actually arrive.
    if (b.action === "subscribe") {
      const r = await waSubscribe(cfg);
      return Response.json(
        r.ok
          ? { ok: true, note: "Account linked to the app. Send a test message now." }
          : { ok: false, error: r.error }
      );
    }

    const to = waNormalize(String(b.to || ""));
    if (to.length < 10) return Response.json({ ok: false, error: "Enter a valid number." });

    const sent = await waSendText(
      cfg,
      to,
      "This is a test from your GoLuQ cockpit. If you are reading it on WhatsApp, sending works."
    );
    if (sent.ok) return Response.json({ ok: true, id: sent.id });

    const outsideWindow = /re-?engagement|24|template/i.test(sent.error);
    return Response.json({
      ok: false,
      error: outsideWindow
        ? "Meta refused this because that number has not messaged your business number in the last 24 hours. Send it a WhatsApp message from that phone first, then try again."
        : sent.error,
    });
  } catch {
    return Response.json({ ok: false, error: "server" }, { status: 500 });
  }
};
