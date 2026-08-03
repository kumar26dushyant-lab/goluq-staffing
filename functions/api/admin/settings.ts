/// <reference types="@cloudflare/workers-types" />

import { checkAdmin, unauthorized } from "../../lib/admin";
import { getSetting, setSetting } from "../../lib/settings";

interface Env {
  DB: D1Database;
  ADMIN_SECRET: string;
}

/** GET → current settings. POST { owner_whatsapp?, followups_enabled? } → save. */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await checkAdmin(request, env))) return unauthorized();
  return Response.json({
    ok: true,
    owner_whatsapp: (await getSetting(env.DB, "owner_whatsapp")) ?? "",
    public_whatsapp: (await getSetting(env.DB, "public_whatsapp")) ?? "",
    followups_enabled: (await getSetting(env.DB, "followups_enabled")) ?? "1",
    bot_instructions: (await getSetting(env.DB, "bot_instructions")) ?? "",
    chat_enabled: (await getSetting(env.DB, "chat_enabled")) ?? "1",
    announcement: (await getSetting(env.DB, "announcement")) ?? "",
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await checkAdmin(request, env))) return unauthorized();
  try {
    const b = await request.json<{ owner_whatsapp?: string; public_whatsapp?: string; followups_enabled?: boolean | string; bot_instructions?: string; chat_enabled?: boolean | string; announcement?: string }>();
    if (typeof b.owner_whatsapp === "string") {
      await setSetting(env.DB, "owner_whatsapp", b.owner_whatsapp.replace(/\D/g, ""));
    }
    if (typeof b.public_whatsapp === "string") {
      await setSetting(env.DB, "public_whatsapp", b.public_whatsapp.replace(/\D/g, ""));
    }
    if (b.followups_enabled !== undefined) {
      const on = b.followups_enabled === true || b.followups_enabled === "1";
      await setSetting(env.DB, "followups_enabled", on ? "1" : "0");
    }
    if (typeof b.bot_instructions === "string") {
      await setSetting(env.DB, "bot_instructions", b.bot_instructions.slice(0, 4000));
    }
    if (typeof b.announcement === "string") {
      await setSetting(env.DB, "announcement", b.announcement.slice(0, 300));
    }
    if (b.chat_enabled !== undefined) {
      const on = b.chat_enabled === true || b.chat_enabled === "1";
      await setSetting(env.DB, "chat_enabled", on ? "1" : "0");
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: "server" }, { status: 500 });
  }
};
