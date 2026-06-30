/// <reference types="@cloudflare/workers-types" />

/**
 * Evolution API client for GoLuQ's Pages Functions (TypeScript port of the
 * Sarathi Python client). GoLuQ SHARES the existing Evolution server with its
 * own instance (GOLUQ_WA_INSTANCE) — it never touches Sarathi/Nidaan instances.
 *
 * Env (set in Cloudflare Pages → Settings → Environment variables, encrypted;
 * copy values from your server's evolution env):
 *   EVOLUTION_API_URL    — public base URL, e.g. https://evolution.example.com
 *   EVOLUTION_API_KEY    — global API key (apikey header)
 *   GOLUQ_WA_INSTANCE    — instance name for GoLuQ, e.g. "goluq_main"
 *   OWNER_WHATSAPP       — owner number to receive lead alerts (E.164 or 10-digit)
 */
export interface EvoEnv {
  EVOLUTION_API_URL?: string;
  EVOLUTION_API_KEY?: string;
  GOLUQ_WA_INSTANCE?: string;
  OWNER_WHATSAPP?: string;
}

export function evoEnabled(env: EvoEnv): boolean {
  return Boolean(env.EVOLUTION_API_URL && env.EVOLUTION_API_KEY && env.GOLUQ_WA_INSTANCE);
}

export function instanceName(env: EvoEnv): string {
  return env.GOLUQ_WA_INSTANCE || "goluq_main";
}

async function evoRequest(
  env: EvoEnv,
  method: string,
  path: string,
  body?: unknown
): Promise<any> {
  const base = (env.EVOLUTION_API_URL || "").replace(/\/$/, "");
  if (!base || !env.EVOLUTION_API_KEY) return { error: "evolution_not_configured" };
  try {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { apikey: env.EVOLUTION_API_KEY, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json: any = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text.slice(0, 500) };
    }
    if (!res.ok) return { error: `http_${res.status}`, detail: text.slice(0, 200) };
    return json;
  } catch (e) {
    return { error: String(e).slice(0, 200) };
  }
}

/** Normalize to digits, prefix 91 for 10-digit Indian numbers (pass JIDs through). */
export function normalizePhone(phone: string): string {
  if ((phone || "").includes("@")) return phone;
  const digits = (phone || "").replace(/\D/g, "");
  return digits.length === 10 ? "91" + digits : digits;
}

export async function sendText(env: EvoEnv, toPhone: string, text: string, delayMs = 0) {
  const body: Record<string, unknown> = { number: normalizePhone(toPhone), text };
  if (delayMs > 0) body.delay = delayMs;
  return evoRequest(env, "POST", `/message/sendText/${instanceName(env)}`, body);
}

/** Create the GoLuQ instance (idempotent — ignores "already exists"). */
export async function createInstance(env: EvoEnv, webhookUrl?: string) {
  const payload: Record<string, unknown> = {
    instanceName: instanceName(env),
    qrcode: true,
    integration: "WHATSAPP-BAILEYS",
    browser: ["Windows", "Chrome", "126.0.0.0"],
  };
  if (webhookUrl) {
    payload.webhook = {
      url: webhookUrl,
      byEvents: false,
      base64: true,
      events: ["QRCODE_UPDATED", "CONNECTION_UPDATE", "MESSAGES_UPSERT"],
    };
  }
  return evoRequest(env, "POST", "/instance/create", payload);
}

/** Trigger QR generation. Returns { base64, pairingCode? }. */
export async function connectInstance(env: EvoEnv) {
  return evoRequest(env, "GET", `/instance/connect/${instanceName(env)}`);
}

/** { state: 'open' | 'connecting' | 'close' }. */
export async function connectionState(env: EvoEnv) {
  return evoRequest(env, "GET", `/instance/connectionState/${instanceName(env)}`);
}
