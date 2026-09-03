/// <reference types="@cloudflare/workers-types" />

import { getSetting } from "../lib/settings";
import { getPricing, EXTRA_PRICES } from "../lib/pricing";
import { getRates } from "../lib/affiliateRates";
import { resolveMarket, convert } from "../lib/markets";

interface Env {
  DB: D1Database;
}

/**
 * Public site config (NO secrets): the visitor-facing WhatsApp number, the live
 * price list, and the guide's on/off switch — all owner-editable in the cockpit.
 * Nothing here is hardcoded; the SPA falls back to src/content/catalogue.ts only
 * if this call fails outright.
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  // Country drives both the default language on a first visit (India gets
  // Hindi, everywhere else English) and which currency prices are shown in.
  //
  // x-country FIRST: it is only ever set when the visitor picked a country
  // themselves, and an explicit choice must beat an inferred one. Everyone else
  // sends no such header and falls through to the edge's own geolocation.
  const country = (
    request.headers.get("x-country") ||
    request.headers.get("cf-ipcountry") ||
    ""
  ).toUpperCase().slice(0, 2);
  const [whatsapp, chatEnabled, announcement] = await Promise.all([
    getSetting(env.DB, "public_whatsapp"),
    getSetting(env.DB, "chat_enabled"),
    getSetting(env.DB, "announcement"),
  ]);

  // The visitor sees their own money. Converted HERE rather than in the browser
  // so the guide quotes exactly what the page prints — a chat saying ₹9,999
  // beside a page saying AED 1,699 loses the customer in one message.
  const { market, multiplier, resolved } = await resolveMarket(env.DB, country);

  let pricing: unknown[] = [];
  try {
    pricing = (await getPricing(env.DB))
      .filter((r) => r.enabled)
      .map((r) => ({
        id: r.id,
        // fromInr stays the rupee figure the owner typed in the cockpit;
        // `from` is what this visitor should actually be shown.
        fromInr: r.price_inr,
        from: convert(r.price_inr, market, multiplier),
        recurring: !!r.recurring,
        leadTime: r.lead_time,
        offerLabel: r.offer_label || null,
        offerInr: r.offer_price_inr || null,
        offer: r.offer_price_inr ? convert(r.offer_price_inr, market, multiplier) : null,
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

  const rates = await getRates(env.DB);

  return Response.json({
    ok: true,
    whatsapp: whatsapp || "",
    country,
    market: resolved,
    // Converted server-side like every other price, for the same reason.
    extras: { voiceLite: convert(EXTRA_PRICES.voiceLite, market, multiplier) },
    affiliate: rates,
    chatEnabled: chatEnabled !== "0",
    announcement: announcement || "",
    pricing,
    content,
  });
};
