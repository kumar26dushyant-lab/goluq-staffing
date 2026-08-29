/// <reference types="@cloudflare/workers-types" />

import { getSetting } from "./settings";

/**
 * Official WhatsApp Business Platform (Meta Cloud API) client.
 *
 * This is the VERIFIED WABA channel — separate from lib/evolution.ts, which
 * drives an unofficial QR-linked session. Both can be configured; outbound
 * prefers this one, because a Meta-verified sender is the one that survives.
 *
 * Credentials come from the environment first and the cockpit second, so the
 * owner can paste them at /admin without an SSH session and a redeploy:
 *   WA_PHONE_NUMBER_ID  — "Phone number ID" from Meta → WhatsApp → API Setup
 *   WA_ACCESS_TOKEN     — permanent System User token (NOT the 24h test token)
 *   WA_VERIFY_TOKEN     — any string you choose; echoed back to Meta at setup
 *   WA_APP_SECRET       — App secret, used to prove a webhook really came from Meta
 */
export interface WaEnv {
  WA_PHONE_NUMBER_ID?: string;
  WA_WABA_ID?: string;
  WA_ACCESS_TOKEN?: string;
  WA_VERIFY_TOKEN?: string;
  WA_APP_SECRET?: string;
}

export interface WaConfig {
  phoneNumberId: string;
  /** WhatsApp Business Account id. Optional — only the subscription check needs it. */
  wabaId: string;
  accessToken: string;
  verifyToken: string;
  appSecret: string;
}

const GRAPH = "https://graph.facebook.com/v21.0";

/** Env wins over the cockpit for secrets; the cockpit fills whatever env omits. */
export async function waConfig(db: D1Database, env: WaEnv): Promise<WaConfig> {
  const s = async (k: string) => (await getSetting(db, k)) || "";
  return {
    phoneNumberId: env.WA_PHONE_NUMBER_ID || (await s("wa_phone_number_id")),
    wabaId: env.WA_WABA_ID || (await s("wa_waba_id")),
    accessToken: env.WA_ACCESS_TOKEN || (await s("wa_access_token")),
    verifyToken: env.WA_VERIFY_TOKEN || (await s("wa_verify_token")),
    appSecret: env.WA_APP_SECRET || (await s("wa_app_secret")),
  };
}

export function waReady(c: WaConfig): boolean {
  return Boolean(c.phoneNumberId && c.accessToken);
}

/** Digits only; a bare 10-digit Indian number gets its country code. */
export function waNormalize(phone: string): string {
  const d = String(phone || "").replace(/\D/g, "");
  return d.length === 10 ? "91" + d : d;
}

/**
 * Result type is deliberately explicit. Two bugs in this codebase came from
 * helpers that returned `{ error }` on failure while the caller read it as
 * success and marched on — so callers here must look at `ok`.
 */
export type WaResult = { ok: true; id: string } | { ok: false; error: string };

async function graph(c: WaConfig, payload: Record<string, unknown>): Promise<WaResult> {
  try {
    const res = await fetch(`${GRAPH}/${c.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
    });
    const text = await res.text();
    if (!res.ok) return { ok: false, error: `http_${res.status}: ${text.slice(0, 200)}` };
    let j: any = {};
    try {
      j = JSON.parse(text);
    } catch {
      /* a 200 with an unparseable body still means Meta accepted it */
    }
    return { ok: true, id: j?.messages?.[0]?.id || "" };
  } catch (e) {
    return { ok: false, error: String(e).slice(0, 200) };
  }
}

/**
 * Free-form text. Only deliverable inside the 24-hour customer service window —
 * i.e. within 24h of the person's last message to us. Outside it Meta rejects
 * the send and only an approved template will go through. See waSendTemplate.
 */
export async function waSendText(c: WaConfig, to: string, text: string): Promise<WaResult> {
  if (!waReady(c)) return { ok: false, error: "whatsapp_not_configured" };
  return graph(c, {
    to: waNormalize(to),
    type: "text",
    text: { preview_url: false, body: String(text).slice(0, 4000) },
  });
}

/** An approved template — the only thing that reaches someone outside 24 hours. */
export async function waSendTemplate(
  c: WaConfig,
  to: string,
  name: string,
  lang = "en",
  bodyParams: string[] = []
): Promise<WaResult> {
  if (!waReady(c)) return { ok: false, error: "whatsapp_not_configured" };
  const components = bodyParams.length
    ? [{ type: "body", parameters: bodyParams.map((t) => ({ type: "text", text: String(t) })) }]
    : undefined;
  return graph(c, {
    to: waNormalize(to),
    type: "template",
    template: { name, language: { code: lang }, ...(components ? { components } : {}) },
  });
}

/** Mark the customer's message read, so they see the blue ticks while we think. */
export async function waMarkRead(c: WaConfig, messageId: string): Promise<void> {
  if (!waReady(c) || !messageId) return;
  await graph(c, { status: "read", message_id: messageId });
}

/**
 * Verify X-Hub-Signature-256. Without this anyone who learns the webhook URL can
 * post fake customer messages and make the guide reply to strangers on our bill.
 * If no app secret is configured we cannot verify, and say so rather than
 * pretending the request was checked.
 */
export async function waVerifySignature(
  c: WaConfig,
  rawBody: string,
  header: string | null
): Promise<boolean> {
  if (!c.appSecret) return false;
  const sig = (header || "").replace(/^sha256=/, "").trim();
  if (!sig) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(c.appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expect = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (expect.length !== sig.length) return false;
  // Constant-time compare — a length-safe equality check leaks nothing by timing.
  let diff = 0;
  for (let i = 0; i < expect.length; i++) diff |= expect.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

/**
 * Is the WhatsApp Business Account actually subscribed to our app?
 *
 * This is a SEPARATE switch from the app's webhook-field subscription, and it is
 * the one people miss: the app can be correctly configured, published, and
 * pointing at the right callback, while the account itself was never linked — in
 * which case Meta forwards nothing and reports no error anywhere.
 */
export async function waSubscribedApps(
  c: WaConfig
): Promise<{ ok: boolean; apps: string[]; error?: string }> {
  if (!c.wabaId || !c.accessToken) return { ok: false, apps: [], error: "no_waba_id" };
  try {
    const res = await fetch(`${GRAPH}/${c.wabaId}/subscribed_apps`, {
      headers: { Authorization: `Bearer ${c.accessToken}` },
    });
    const j: any = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, apps: [], error: j?.error?.message || `http_${res.status}` };
    const apps = (j?.data || [])
      .map((d: any) => d?.whatsapp_business_api_data?.name || d?.whatsapp_business_api_data?.id || "")
      .filter(Boolean);
    return { ok: true, apps };
  } catch (e) {
    return { ok: false, apps: [], error: String(e).slice(0, 160) };
  }
}

/** Link the account to this app, which is what makes inbound messages arrive. */
export async function waSubscribe(c: WaConfig): Promise<WaResult> {
  if (!c.wabaId || !c.accessToken) return { ok: false, error: "whatsapp_not_configured" };
  try {
    const res = await fetch(`${GRAPH}/${c.wabaId}/subscribed_apps`, {
      method: "POST",
      headers: { Authorization: `Bearer ${c.accessToken}` },
    });
    const text = await res.text();
    if (!res.ok) return { ok: false, error: `http_${res.status}: ${text.slice(0, 200)}` };
    return { ok: true, id: "" };
  } catch (e) {
    return { ok: false, error: String(e).slice(0, 200) };
  }
}
