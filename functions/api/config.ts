/// <reference types="@cloudflare/workers-types" />

import { getSetting } from "../lib/settings";
import { getPricing } from "../lib/pricing";

interface Env {
  DB: D1Database;
}

/**
 * Public site config (NO secrets): the visitor-facing WhatsApp number, the live
 * price list, and the guide's on/off switch — all owner-editable in the cockpit.
 * Nothing here is hardcoded; the SPA falls back to src/content/catalogue.ts only
 * if this call fails outright.
 */
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const [whatsapp, chatEnabled, announcement] = await Promise.all([
    getSetting(env.DB, "public_whatsapp"),
    getSetting(env.DB, "chat_enabled"),
    getSetting(env.DB, "announcement"),
  ]);

  let pricing: unknown[] = [];
  try {
    pricing = (await getPricing(env.DB))
      .filter((r) => r.enabled)
      .map((r) => ({
        id: r.id,
        fromInr: r.price_inr,
        recurring: !!r.recurring,
        leadTime: r.lead_time,
        offerLabel: r.offer_label || null,
        offerInr: r.offer_price_inr || null,
      }));
  } catch {
    // Site must render even if the pricing table is unavailable.
  }

  // Owner-edited copy, overlaid on the shipped translations by the SPA.
  let content: Record<string, { en?: string; hi?: string }> = {};
  try {
    const rows = await env.DB.prepare(
      `SELECT key, val_en, val_hi FROM content_overrides`
    ).all<{ key: string; val_en: string | null; val_hi: string | null }>();
    for (const r of rows.results ?? []) {
      content[r.key] = { en: r.val_en || undefined, hi: r.val_hi || undefined };
    }
  } catch {
    content = {};
  }

  return Response.json({
    ok: true,
    whatsapp: whatsapp || "",
    chatEnabled: chatEnabled !== "0",
    announcement: announcement || "",
    pricing,
    content,
  });
};
