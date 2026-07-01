/// <reference types="@cloudflare/workers-types" />

import { checkAdmin, unauthorized } from "../../lib/admin";
import { getSetting, setSetting } from "../../lib/settings";

interface Env {
  DB: D1Database;
  ADMIN_SECRET: string;
}

/** GET → current settings. POST { owner_whatsapp?, followups_enabled? } → save. */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!checkAdmin(request, env)) return unauthorized();
  return Response.json({
    ok: true,
    owner_whatsapp: (await getSetting(env.DB, "owner_whatsapp")) ?? "",
    followups_enabled: (await getSetting(env.DB, "followups_enabled")) ?? "1",
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!checkAdmin(request, env)) return unauthorized();
  try {
    const b = await request.json<{ owner_whatsapp?: string; followups_enabled?: boolean | string }>();
    if (typeof b.owner_whatsapp === "string") {
      const digits = b.owner_whatsapp.replace(/\D/g, "");
      await setSetting(env.DB, "owner_whatsapp", digits);
    }
    if (b.followups_enabled !== undefined) {
      const on = b.followups_enabled === true || b.followups_enabled === "1";
      await setSetting(env.DB, "followups_enabled", on ? "1" : "0");
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: "server" }, { status: 500 });
  }
};
