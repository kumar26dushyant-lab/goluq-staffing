/// <reference types="@cloudflare/workers-types" />

import { checkAdmin, unauthorized } from "../../lib/admin";
import { evoEnabled, sendText, type EvoEnv } from "../../lib/evolution";

interface Env extends EvoEnv {
  ADMIN_SECRET: string;
}

/** Admin: send a test/manual WhatsApp message. Body { to, text }. */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!checkAdmin(request, env)) return unauthorized();
  if (!evoEnabled(env)) return Response.json({ ok: false, error: "evolution_not_configured" }, { status: 503 });
  try {
    const { to, text } = await request.json<{ to?: string; text?: string }>();
    if (!to || !text) return Response.json({ ok: false, error: "to & text required" }, { status: 400 });
    const res = await sendText(env, to, text);
    return Response.json({ ok: !res?.error, result: res });
  } catch {
    return Response.json({ ok: false, error: "server" }, { status: 500 });
  }
};
