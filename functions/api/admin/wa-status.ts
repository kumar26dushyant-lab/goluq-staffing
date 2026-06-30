/// <reference types="@cloudflare/workers-types" />

import { connectionState, evoEnabled, type EvoEnv } from "../../lib/evolution";

interface Env extends EvoEnv {
  ADMIN_SECRET: string;
}

/** Admin: current WhatsApp connection state for GoLuQ's instance. */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (new URL(request.url).searchParams.get("secret") !== env.ADMIN_SECRET) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
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
