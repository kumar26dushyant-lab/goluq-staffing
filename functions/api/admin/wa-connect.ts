/// <reference types="@cloudflare/workers-types" />

import { createInstance, connectInstance, connectionState, evoEnabled, type EvoEnv } from "../../lib/evolution";
import { checkAdmin, unauthorized } from "../../lib/admin";

interface Env extends EvoEnv {
  ADMIN_SECRET: string;
}

/**
 * Admin: connect GoLuQ's WhatsApp number. Creates the instance (idempotent),
 * triggers QR generation, and returns the QR (base64 PNG) to scan with the new
 * number. Gated by x-admin-secret. No effect on Sarathi/Nidaan instances.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!checkAdmin(request, env)) return unauthorized();
  if (!evoEnabled(env)) {
    return Response.json({ ok: false, error: "evolution_not_configured" }, { status: 503 });
  }

  // Create is idempotent enough for our purpose — ignore "already exists" errors.
  // Register the inbound webhook so customer replies (incl. opt-outs) reach us.
  const origin = new URL(request.url).origin;
  await createInstance(env, `${origin}/api/wa/webhook`);
  const conn = await connectInstance(env);
  const state = await connectionState(env);

  const currentState = state?.instance?.state || state?.state || "unknown";
  // Only surface a QR when NOT already connected. Never expose the raw QR
  // content ("code") — it's not a human pairing code.
  const qr = currentState === "open" ? null : conn?.base64 || conn?.qrcode?.base64 || null;

  return Response.json({ ok: true, qr, state: currentState });
};
