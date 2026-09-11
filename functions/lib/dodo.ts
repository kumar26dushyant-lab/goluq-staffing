/// <reference types="@cloudflare/workers-types" />

import { getSetting, setSetting } from "./settings";

/**
 * Dodo Payments — the merchant of record for customers outside India.
 *
 * Razorpay settles in rupees and needs its own international enablement; Dodo
 * takes cards, PayPal and local methods worldwide, handles tax, and shows the
 * customer their own currency. We charge in USD (the price the site already
 * shows abroad, or its conversion) and let Dodo's adaptive currency display
 * the local equivalent.
 *
 * One product does all the work: a "pay what you want" item whose amount we
 * set per payment. It is created on first use under the GoLuQ brand and its
 * id remembered, so the owner never has to touch the Dodo product list.
 * Secrets live in the cockpit, write-only.
 */
export interface DodoConfig {
  apiKey: string;
  webhookSecret: string;
  brandId: string;
  productId: string;
  test: boolean;
}

export async function dodoConfig(db: D1Database): Promise<DodoConfig> {
  const s = async (k: string) => (await getSetting(db, k)) || "";
  return {
    apiKey: await s("dodo_api_key"),
    webhookSecret: await s("dodo_webhook_secret"),
    brandId: await s("dodo_brand_id"),
    productId: await s("dodo_product_id"),
    test: (await s("dodo_test_mode")) === "1",
  };
}
export const dodoReady = (c: DodoConfig) => !!c.apiKey;
const base = (c: DodoConfig) => (c.test ? "https://test.dodopayments.com" : "https://live.dodopayments.com");

async function api(c: DodoConfig, path: string, body: unknown): Promise<{ ok: boolean; status: number; json: any }> {
  try {
    const res = await fetch(`${base(c)}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${c.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json: any = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, json };
  } catch (e) {
    return { ok: false, status: 0, json: { message: String(e).slice(0, 200) } };
  }
}

/** The pay-what-you-want product every GoLuQ charge rides on; created once. */
export async function ensureProduct(db: D1Database, c: DodoConfig): Promise<string | null> {
  if (c.productId) return c.productId;
  const r = await api(c, "/products", {
    name: "GoLuQ.com services",
    description: "Software, WhatsApp, voice and toll-free systems built and run by GoLuQ.com Digital Consultancy. Amount as agreed on your quote or call.",
    tax_category: "saas",
    ...(c.brandId ? { brand_id: c.brandId } : {}),
    price: { type: "one_time_price", currency: "USD", price: 100, pay_what_you_want: true, purchasing_power_parity: false, tax_inclusive: true },
  });
  const id = String(r.json?.product_id || "");
  if (!r.ok || !id) {
    console.log("dodo product not created:", r.status, JSON.stringify(r.json).slice(0, 200));
    return null;
  }
  await setSetting(db, "dodo_product_id", id);
  return id;
}

export type DodoLink = { ok: true; id: string; url: string } | { ok: false; error: string };

export async function createDodoPayment(
  db: D1Database,
  c: DodoConfig,
  o: {
    amountUsd: number;
    description: string;
    customer: { email: string; name?: string; phone?: string };
    country: string;
    metadata: Record<string, string>;
  }
): Promise<DodoLink> {
  if (!dodoReady(c)) return { ok: false, error: "Dodo Payments key is not set (cockpit → Settings → Payments)." };
  const productId = await ensureProduct(db, c);
  if (!productId) return { ok: false, error: "Dodo product could not be created — check the API key and brand id." };
  const r = await api(c, "/payments", {
    payment_link: true,
    return_url: "https://goluq.com/thanks?provider=dodo",
    product_cart: [{ product_id: productId, quantity: 1, amount: Math.max(100, Math.round(o.amountUsd * 100)) }],
    customer: {
      email: o.customer.email,
      ...(o.customer.name ? { name: o.customer.name.slice(0, 100) } : {}),
      ...(o.customer.phone ? { phone_number: "+" + o.customer.phone.replace(/\D/g, "") } : {}),
    },
    billing: { country: /^[A-Z]{2}$/.test(o.country) ? o.country : "US" },
    metadata: { ...o.metadata, description: o.description.slice(0, 200) },
  });
  if (!r.ok || !r.json?.payment_link) {
    return { ok: false, error: String(r.json?.message || r.json?.error || `http_${r.status}`).slice(0, 200) };
  }
  return { ok: true, id: String(r.json.payment_id), url: String(r.json.payment_link) };
}

/**
 * Standard-Webhooks signature: HMAC-SHA256 over "id.timestamp.body", base64,
 * carried as "v1,<sig>" (several may be space-separated). The secret is
 * "whsec_" + base64 key; a raw secret is also accepted in case the dashboard
 * shows it without the prefix.
 */
export async function dodoVerify(secret: string, headers: Headers, raw: string): Promise<boolean> {
  const id = headers.get("webhook-id") || "";
  const ts = headers.get("webhook-timestamp") || "";
  const sigHeader = headers.get("webhook-signature") || "";
  if (!secret || !id || !ts || !sigHeader) return false;
  // Replay window: five minutes either side.
  const age = Math.abs(Date.now() / 1000 - Number(ts));
  if (!Number.isFinite(age) || age > 300) return false;
  const keys: Uint8Array[] = [];
  const stripped = secret.replace(/^whsec_/, "");
  try { keys.push(Uint8Array.from(atob(stripped), (ch) => ch.charCodeAt(0))); } catch { /* not base64 */ }
  keys.push(new TextEncoder().encode(secret));
  const msg = new TextEncoder().encode(`${id}.${ts}.${raw}`);
  const given = sigHeader.split(" ").map((p) => p.split(",")[1] || "").filter(Boolean);
  for (const k of keys) {
    const key = await crypto.subtle.importKey("raw", k, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, msg));
    const b64 = btoa(String.fromCharCode(...mac));
    if (given.includes(b64)) return true;
  }
  return false;
}
