/// <reference types="@cloudflare/workers-types" />

import { connectionState, evoEnabled, type EvoEnv } from "../../lib/evolution";
import { checkAdmin, unauthorized } from "../../lib/admin";

interface Env extends EvoEnv {
  ADMIN_SECRET: string;
}

/** Admin: current WhatsApp connection state for GoLuQ's instance. */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!checkAdmin(request, env)) return unauthorized();
  if (!evoEnabled(env)) {
    return Response.json({ ok: true, configured: false, state: "not_configured" });
  }
  const state = await connectionState(env);
  return Response.json({
    ok: true,
    configured: true,
    state: state?.instance?.state || state?.state || "unknown",
  });
};
