/// <reference types="@cloudflare/workers-types" />

import { getSetting } from "./settings";

/**
 * What a visitor pays, in the money they think in.
 *
 * THESE ARE PRICE BANDS, NOT EXCHANGE RATES. `perInr` is a pricing constant, not
 * a live FX quote, and it is deliberately not fetched from any rate feed: the
 * point is a stable, round, local-looking price, not an accurate conversion. A
 * price that moves every morning because the rupee moved is a price nobody
 * trusts — and a page that has to call an FX API is a page that breaks when the
 * API does. Review these once or twice a year; nothing breaks if they drift.
 *
 * WHY NOT STRAIGHT CONVERSION: ₹9,999 is about $115. To a business in the US or
 * Dubai that does not read as a bargain, it reads as amateur — and it caps what
 * we could ever quote that buyer afterwards. The same low overhead that makes
 * ₹9,999 profitable in Indore makes $449 a fraction of what a local agency
 * charges. `band` is what turns one into the other.
 */
export interface Market {
  /** ISO-4217 code, e.g. "AED". */
  currency: string;
  /** Locale used only for formatting the number. */
  locale: string;
  /** Currency units per ₹1 — a pricing constant, see above. */
  perInr: number;
  /**
   * Purchasing-power band relative to the international multiplier. 1 = full
   * international pricing; South Asia is deliberately lower, because charging a
   * business in Dhaka what a business in Sydney pays is not a strategy, it is a
   * way to sell nothing.
   */
  band: number;
  /** Prices are rounded to a multiple of this, then dropped by one unit. */
  round: number;
}

const INDIA: Market = { currency: "INR", locale: "en-IN", perInr: 1, band: 0, round: 0 };

const USD: Market = { currency: "USD", locale: "en-US", perInr: 1 / 88, band: 1, round: 50 };
const AED: Market = { currency: "AED", locale: "en-AE", perInr: 1 / 24, band: 1, round: 100 };
const SAR: Market = { currency: "SAR", locale: "en-SA", perInr: 1 / 23.5, band: 1, round: 100 };
const GBP: Market = { currency: "GBP", locale: "en-GB", perInr: 1 / 112, band: 1, round: 50 };
const EUR: Market = { currency: "EUR", locale: "en-IE", perInr: 1 / 96, band: 1, round: 50 };
// Deliberately formatted with en-US: in their own locales AUD, CAD and SGD all
// render as a bare "$", which an Australian reads as US dollars — roughly double
// the real price. en-US disambiguates them as A$, CA$ and SGD.
const AUD: Market = { currency: "AUD", locale: "en-US", perInr: 1 / 57, band: 1, round: 50 };
const CAD: Market = { currency: "CAD", locale: "en-US", perInr: 1 / 63, band: 1, round: 50 };
const SGD: Market = { currency: "SGD", locale: "en-US", perInr: 1 / 65, band: 1, round: 50 };
/** Neighbouring markets, priced far closer to India than to the West. */
const SOUTH_ASIA: Market = { currency: "USD", locale: "en-US", perInr: 1 / 88, band: 0.35, round: 10 };

const EURO_ZONE = [
  "AT", "BE", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR", "IE", "IT",
  "LT", "LU", "LV", "MT", "NL", "PT", "SI", "SK",
];

const BY_COUNTRY: Record<string, Market> = {
  IN: INDIA,
  US: USD,
  AE: AED,
  SA: SAR,
  GB: GBP,
  AU: AUD,
  CA: CAD,
  SG: SGD,
  // The rest of the Gulf bills comfortably in dirhams.
  QA: AED, KW: AED, OM: AED, BH: AED,
  BD: SOUTH_ASIA, PK: SOUTH_ASIA, LK: SOUTH_ASIA, NP: SOUTH_ASIA, BT: SOUTH_ASIA,
  ...Object.fromEntries(EURO_ZONE.map((c) => [c, EUR])),
};

export function marketFor(country: string): Market {
  return BY_COUNTRY[(country || "").toUpperCase()] || USD;
}

/** The owner's international multiplier. Editable in the cockpit. */
export async function intlMultiplier(db: D1Database): Promise<number> {
  const raw = await getSetting(db, "intl_multiplier");
  // Reject empty BEFORE coercing: Number("") is 0, which would pass a
  // "finite and positive" check as a free price list.
  if (raw === null || raw.trim() === "") return 4;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 4;
}

/**
 * Convert a rupee price into the visitor's market.
 *
 * India is returned untouched — it is the base, and rounding it would quietly
 * change prices the owner set by hand in the cockpit.
 */
export function convert(inrAmount: number, m: Market, multiplier: number): number {
  if (m.currency === "INR" || !m.round) return Math.round(inrAmount);
  const raw = inrAmount * m.perInr * multiplier * m.band;
  if (raw <= 0) return 0;
  // Round to the nearest step, then take one off — 449 rather than 450, which
  // every buyer in every market reads as a considered price.
  const stepped = Math.max(m.round, Math.round(raw / m.round) * m.round);
  return stepped - 1;
}

/**
 * Convert a pricing ROW for a market.
 *
 * Most rows are rupee-priced and derive their international price from the
 * band multiplier. The productised offers carry an explicit USD figure instead,
 * because "$2,900" was a decision and INR × 4 lands at $4,500. When one is set
 * and the visitor is outside India, it becomes the base and is converted into
 * the visitor's currency at the USD ratio — so a UAE visitor sees the AED
 * equivalent of $2,900, not of ₹1L × 4.
 *
 * An offer price on such a row is scaled by the same ratio the list price was,
 * so a discount stays the same percentage in every currency.
 */
export function convertRow(
  row: { price_inr: number; price_intl_usd: number | null },
  inrAmount: number,
  m: Market,
  multiplier: number
): number {
  if (m.currency === "INR" || !row.price_intl_usd || row.price_inr <= 0) {
    return convert(inrAmount, m, multiplier);
  }
  // USD → this market. perInr values are units-per-rupee, so the ratio between
  // two of them is the exchange between those currencies.
  const usdPerInr = 1 / 88;
  const share = inrAmount / row.price_inr; // 1 for the list price, <1 for an offer
  const raw = row.price_intl_usd * share * (m.perInr / usdPerInr);
  if (raw <= 0) return 0;
  if (m.currency === "USD") return Math.round(raw);
  const stepped = Math.max(m.round, Math.round(raw / m.round) * m.round);
  return stepped - 1;
}

/** Everything the SPA and the guide need to show one consistent price. */
export interface ResolvedMarket {
  country: string;
  currency: string;
  locale: string;
  /** True when the visitor sees rupees — the only market the owner prices directly. */
  isIndia: boolean;
}

export async function resolveMarket(
  db: D1Database,
  country: string
): Promise<{ market: Market; multiplier: number; resolved: ResolvedMarket }> {
  const market = marketFor(country);
  const multiplier = await intlMultiplier(db);
  return {
    market,
    multiplier,
    resolved: {
      country: (country || "").toUpperCase(),
      currency: market.currency,
      locale: market.locale,
      isIndia: market.currency === "INR",
    },
  };
}

/** Server-side formatter, so the guide quotes exactly what the page prints. */
export function formatMoney(amount: number, m: Market): string {
  try {
    return new Intl.NumberFormat(m.locale, {
      style: "currency",
      currency: m.currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${m.currency} ${Math.round(amount)}`;
  }
}
