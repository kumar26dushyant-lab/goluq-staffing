/// <reference types="@cloudflare/workers-types" />

import { checkAdmin, unauthorized } from "../../lib/admin";
import { getSetting, setSetting } from "../../lib/settings";
import { saveRates } from "../../lib/affiliateRates";
import { randomToken } from "../../lib/auth";

interface Env {
  DB: D1Database;
  ADMIN_SECRET: string;
}

/** GET → current settings. POST { owner_whatsapp?, followups_enabled? } → save. */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await checkAdmin(request, env))) return unauthorized();
  // The calendar bridge (docs/booking-bridge) authenticates with this. Minted
  // the first time the cockpit asks for it, then stable.
  let bookingSecret = (await getSetting(env.DB, "booking_secret")) ?? "";
  if (!bookingSecret) {
    bookingSecret = randomToken(18);
    await setSetting(env.DB, "booking_secret", bookingSecret);
  }
  return Response.json({
    ok: true,
    booking_secret: bookingSecret,
    owner_whatsapp: (await getSetting(env.DB, "owner_whatsapp")) ?? "",
    owner_email: (await getSetting(env.DB, "owner_email")) ?? "",
    public_whatsapp: (await getSetting(env.DB, "public_whatsapp")) ?? "",
    public_telegram: (await getSetting(env.DB, "public_telegram")) ?? "",
    followups_enabled: (await getSetting(env.DB, "followups_enabled")) ?? "1",
    bot_instructions: (await getSetting(env.DB, "bot_instructions")) ?? "",
    chat_enabled: (await getSetting(env.DB, "chat_enabled")) ?? "1",
    announcement: (await getSetting(env.DB, "announcement")) ?? "",
    // A calendar link. A $2,900 sale is made on a call, not in a chat widget.
    booking_url: (await getSetting(env.DB, "booking_url")) ?? "",
    // WhatsApp Business Platform. The two non-secret ids come back in full so
    // they can be checked at a glance; the token and the app secret never leave
    // the server — the UI only needs to know whether they are set.
    wa_phone_number_id: (await getSetting(env.DB, "wa_phone_number_id")) ?? "",
    wa_verify_token: (await getSetting(env.DB, "wa_verify_token")) ?? "",
    wa_waba_id: (await getSetting(env.DB, "wa_waba_id")) ?? "",
    wa_access_token_set: Boolean(await getSetting(env.DB, "wa_access_token")),
    wa_app_secret_set: Boolean(await getSetting(env.DB, "wa_app_secret")),
    // Telegram cockpit bot. Token is write-only, like the WhatsApp secrets.
    tg_bot_token_set: Boolean(await getSetting(env.DB, "tg_bot_token")),
    tg_owner_chat_id: (await getSetting(env.DB, "tg_owner_chat_id")) ?? "",
    tg_bot_username: (await getSetting(env.DB, "tg_bot_username")) ?? "",
    // Razorpay. Key id is public by nature; the secret and webhook secret are write-only.
    razorpay_key_id: (await getSetting(env.DB, "razorpay_key_id")) ?? "",
    razorpay_key_secret_set: Boolean(await getSetting(env.DB, "razorpay_key_secret")),
    razorpay_webhook_secret_set: Boolean(await getSetting(env.DB, "razorpay_webhook_secret")),
    call_paid_all: (await getSetting(env.DB, "call_paid_all")) ?? "0",
    wa_tpl_payment_link: (await getSetting(env.DB, "wa_tpl_payment_link")) ?? "",
    // Client sign-in: Google OAuth (secret write-only) and the WhatsApp OTP template.
    google_client_id: (await getSetting(env.DB, "google_client_id")) ?? "",
    google_client_secret_set: Boolean(await getSetting(env.DB, "google_client_secret")),
    wa_tpl_login_otp: (await getSetting(env.DB, "wa_tpl_login_otp")) ?? "",
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await checkAdmin(request, env))) return unauthorized();
  try {
    const b = await request.json<{ owner_whatsapp?: string; public_whatsapp?: string; followups_enabled?: boolean | string; bot_instructions?: string; chat_enabled?: boolean | string; announcement?: string; aff_rate?: number; aff_enh_months?: number; aff_typical_margin?: number; aff_min_payout?: number; aff_attribution_days?: number; owner_email?: string; booking_url?: string; public_telegram?: string; wa_phone_number_id?: string; wa_waba_id?: string; wa_verify_token?: string; wa_access_token?: string; wa_app_secret?: string; tg_bot_token?: string; razorpay_key_id?: string; razorpay_key_secret?: string; razorpay_webhook_secret?: string; call_paid_all?: boolean | string; wa_tpl_payment_link?: string; google_client_id?: string; google_client_secret?: string; wa_tpl_login_otp?: string }>();
    if (typeof b.owner_whatsapp === "string") {
      await setSetting(env.DB, "owner_whatsapp", b.owner_whatsapp.replace(/\D/g, ""));
    }
    if (typeof b.owner_email === "string") {
      await setSetting(env.DB, "owner_email", b.owner_email.trim().toLowerCase().slice(0, 200));
    }
    if (typeof b.public_whatsapp === "string") {
      await setSetting(env.DB, "public_whatsapp", b.public_whatsapp.replace(/\D/g, ""));
    }
    if (typeof b.public_telegram === "string") {
      // Accept "@name", "name" or a t.me link; store the bare username.
      const u = b.public_telegram.trim().replace(/^https?:\/\/(t\.me|telegram\.me)\//i, "").replace(/^@/, "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 32);
      await setSetting(env.DB, "public_telegram", u);
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
      rate: b.aff_rate !== undefined ? Number(b.aff_rate) : undefined,
      enhancementMonths: b.aff_enh_months !== undefined ? Number(b.aff_enh_months) : undefined,
      typicalMargin: b.aff_typical_margin !== undefined ? Number(b.aff_typical_margin) : undefined,
      minPayoutInr: b.aff_min_payout !== undefined ? Number(b.aff_min_payout) : undefined,
      attributionDays: b.aff_attribution_days !== undefined ? Number(b.aff_attribution_days) : undefined,
    });
    if (typeof b.booking_url === "string") {
      const u = b.booking_url.trim().slice(0, 400);
      // Only an https URL or nothing. A stray "calendly.com/x" would become a
      // relative link to goluq.com/calendly.com/x.
      await setSetting(env.DB, "booking_url", /^https:\/\//i.test(u) ? u : "");
    }
    if (typeof b.wa_phone_number_id === "string") {
      await setSetting(env.DB, "wa_phone_number_id", b.wa_phone_number_id.replace(/\D/g, ""));
    }
    if (typeof b.wa_waba_id === "string") {
      await setSetting(env.DB, "wa_waba_id", b.wa_waba_id.replace(/\D/g, ""));
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
    if (b.tg_bot_token) {
      // A new bot means a new identity: forget the old username so the next
      // Connect re-reads it, but keep the pairing — it is the owner's chat either way.
      await setSetting(env.DB, "tg_bot_token", b.tg_bot_token.trim());
      await setSetting(env.DB, "tg_bot_username", "");
    }
    if (typeof b.razorpay_key_id === "string") {
      await setSetting(env.DB, "razorpay_key_id", b.razorpay_key_id.trim().slice(0, 60));
    }
    if (b.razorpay_key_secret) await setSetting(env.DB, "razorpay_key_secret", b.razorpay_key_secret.trim());
    if (b.razorpay_webhook_secret) await setSetting(env.DB, "razorpay_webhook_secret", b.razorpay_webhook_secret.trim());
    if (b.call_paid_all !== undefined) {
      const on = b.call_paid_all === true || b.call_paid_all === "1";
      await setSetting(env.DB, "call_paid_all", on ? "1" : "0");
    }
    if (typeof b.wa_tpl_payment_link === "string") {
      await setSetting(env.DB, "wa_tpl_payment_link", b.wa_tpl_payment_link.trim().replace(/[^a-z0-9_]/g, "").slice(0, 100));
    }
    if (typeof b.google_client_id === "string") await setSetting(env.DB, "google_client_id", b.google_client_id.trim().slice(0, 200));
    if (b.google_client_secret) await setSetting(env.DB, "google_client_secret", b.google_client_secret.trim());
    if (typeof b.wa_tpl_login_otp === "string") await setSetting(env.DB, "wa_tpl_login_otp", b.wa_tpl_login_otp.trim().replace(/[^a-z0-9_]/g, "").slice(0, 100));
    if (b.chat_enabled !== undefined) {
      const on = b.chat_enabled === true || b.chat_enabled === "1";
      await setSetting(env.DB, "chat_enabled", on ? "1" : "0");
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: "server" }, { status: 500 });
  }
};
