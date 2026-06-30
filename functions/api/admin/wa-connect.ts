/// <reference types="@cloudflare/workers-types" />

import { createInstance, connectInstance, connectionState, evoEnabled, type EvoEnv } from "../../lib/evolution";

interface Env extends EvoEnv {
  ADMIN_SECRET: string;
}

/**
 * Admin: connect GoLuQ's WhatsApp number. Creates the instance (idempotent),
 * triggers QR generation, and returns the QR (base64 PNG) to scan with the new
 * number. Gated by x-admin-secret. No effect on Sarathi/Nidaan instances.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (request.headers.get("x-admin-secret") !== env.ADMIN_SECRET) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!evoEnabled(env)) {
    return Response.json({ ok: false, error: "evolution_not_configured" }, { status: 503 });
  }

  // Create is idempotent enough for our purpose — ignore "already exists" errors.
  await createInstance(env);
  const conn = await connectInstance(env);
  const state = await connectionState(env);

  const qr = conn?.base64 || conn?.qrcode?.base64 || null;
  const pairingCode = conn?.pairingCode || conn?.code || null;

  return Response.json({
    ok: true,
    qr, // data:image/png;base64,... (or null if already connected)
    pairingCode,
    state: state?.instance?.state || state?.state || "unknown",
  });
};
