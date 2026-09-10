/// <reference types="@cloudflare/workers-types" />

import { getSetting } from "./settings";

/**
 * Razorpay Payment Links — the one payment surface we need today.
 *
 * A link is a URL the customer can pay on any way they like (UPI, card,
 * netbanking). It can expire, it can be re-issued, and Razorpay tells us by
 * webhook when it is paid. Keys live in the cockpit (write-only), like every
 * other secret; nothing here runs until they are set.
 */
export interface RzpConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
}

export async function rzpConfig(db: D1Database): Promise<RzpConfig> {
  const s = async (k: string) => (await getSetting(db, k)) || "";
  return { keyId: await s("razorpay_key_id"), keySecret: await s("razorpay_key_secret"), webhookSecret: await s("razorpay_webhook_secret") };
}
export const rzpReady = (c: RzpConfig) => !!c.keyId && !!c.keySecret;

export type RzpLink = { ok: true; id: string; url: string } | { ok: false; error: string };

export async function createPaymentLink(
  c: RzpConfig,
  o: {
    amountInr: number;
    description: string;
    referenceId: string;
    customer: { name?: string; contact?: string; email?: string };
    /** Unix seconds. Razorpay requires at least ~15 minutes ahead. */
    expireBy?: number;
    notes?: Record<string, string>;
  }
): Promise<RzpLink> {
  if (!rzpReady(c)) return { ok: false, error: "Razorpay keys are not set (cockpit → Settings → Payments)." };
  const customer: Record<string, string> = {};
  if (o.customer.name) customer.name = o.customer.name.slice(0, 100);
  if (o.customer.contact) customer.contact = "+" + o.customer.contact.replace(/\D/g, "");
  if (o.customer.email) customer.email = o.customer.email;
  const body: Record<string, unknown> = {
    amount: Math.round(o.amountInr * 100),
    currency: "INR",
    accept_partial: false,
    reference_id: o.referenceId.slice(0, 40),
    description: o.description.slice(0, 2000),
    customer,
    // We send the link ourselves on WhatsApp and email; Razorpay's own SMS
    // and email would duplicate that and confuse the customer.
    notify: { sms: false, email: false },
    reminder_enable: false,
    notes: o.notes || {},
    callback_url: "https://goluq.com/thanks",
    callback_method: "get",
  };
  if (o.expireBy) body.expire_by = o.expireBy;
  try {
    const res = await fetch("https://api.razorpay.com/v1/payment_links", {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${c.keyId}:${c.keySecret}`),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const j: any = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: j?.error?.description || `http_${res.status}` };
    return { ok: true, id: String(j.id), url: String(j.short_url) };
  } catch (e) {
    return { ok: false, error: String(e).slice(0, 200) };
  }
}

/** Razorpay signs webhooks with HMAC-SHA256 of the raw body using the webhook secret. */
export async function rzpVerify(secret: string, raw: string, signature: string | null): Promise<boolean> {
  if (!secret || !signature) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw));
  const hex = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === signature.trim().toLowerCase();
}
