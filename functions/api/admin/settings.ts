/// <reference types="@cloudflare/workers-types" />

import { checkAdmin, unauthorized } from "../../lib/admin";
import { getSetting, setSetting } from "../../lib/settings";
import { saveRates } from "../../lib/affiliateRates";

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
    owner_email: (await getSetting(env.DB, "owner_email")) ?? "",
    public_whatsapp: (await getSetting(env.DB, "public_whatsapp")) ?? "",
    followups_enabled: (await getSetting(env.DB, "followups_enabled")) ?? "1",
    bot_instructions: (await getSetting(env.DB, "bot_instructions")) ?? "",
    chat_enabled: (await getSetting(env.DB, "chat_enabled")) ?? "1",
    announcement: (await getSetting(env.DB, "announcement")) ?? "",
    // WhatsApp Business Platform. The two non-secret ids come back in full so
    // they can be checked at a glance; the token and the app secret never leave
    // the server — the UI only needs to know whether they are set.
    wa_phone_number_id: (await getSetting(env.DB, "wa_phone_number_id")) ?? "",
    wa_verify_token: (await getSetting(env.DB, "wa_verify_token")) ?? "",
    wa_access_token_set: Boolean(await getSetting(env.DB, "wa_access_token")),
    wa_app_secret_set: Boolean(await getSetting(env.DB, "wa_app_secret")),
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await checkAdmin(request, env))) return unauthorized();
  try {
    const b = await request.json<{ owner_whatsapp?: string; public_whatsapp?: string; followups_enabled?: boolean | string; bot_instructions?: string; chat_enabled?: boolean | string; announcement?: string; aff_rate_year1?: number; aff_rate_lifetime?: number; aff_min_payout?: number; aff_attribution_days?: number; owner_email?: string; wa_phone_number_id?: string; wa_verify_token?: string; wa_access_token?: string; wa_app_secret?: string }>();
    if (typeof b.owner_whatsapp === "string") {
      await setSetting(env.DB, "owner_whatsapp", b.owner_whatsapp.replace(/\D/g, ""));
    }
    if (typeof b.owner_email === "string") {
      await setSetting(env.DB, "owner_email", b.owner_email.trim().toLowerCase().slice(0, 200));
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
    // Partner commission terms live alongside the other runtime settings.
    await saveRates(env.DB, {
      year1: b.aff_rate_year1 !== undefined ? Number(b.aff_rate_year1) : undefined,
      lifetime: b.aff_rate_lifetime !== undefined ? Number(b.aff_rate_lifetime) : undefined,
      minPayoutInr: b.aff_min_payout !== undefined ? Number(b.aff_min_payout) : undefined,
      attributionDays: b.aff_attribution_days !== undefined ? Number(b.aff_attribution_days) : undefined,
    });
    if (typeof b.wa_phone_number_id === "string") {
      await setSetting(env.DB, "wa_phone_number_id", b.wa_phone_number_id.replace(/\D/g, ""));
    }
    if (typeof b.wa_verify_token === "string") {
      await setSetting(env.DB, "wa_verify_token", b.wa_verify_token.trim().slice(0, 200));
    }
    // Secrets are only ever WRITTEN, never read back, so the form cannot send
    // them and therefore must not be able to clear them: an empty value here
    // means "unchanged". This is the same trap that silently wiped the public WhatsApp
    // number once already.
    if (b.wa_access_token) {
      await setSetting(env.DB, "wa_access_token", b.wa_access_token.trim());
    }
    if (b.wa_app_secret) {
      await setSetting(env.DB, "wa_app_secret", b.wa_app_secret.trim());
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
