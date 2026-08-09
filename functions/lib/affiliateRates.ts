/// <reference types="@cloudflare/workers-types" />

import { getSetting, setSetting } from "./settings";

/**
 * Affiliate economics — owner-editable, because these are commercial terms that
 * change, not constants. src/content/affiliateConfig.ts holds the same defaults
 * and remains the offline fallback for the SPA; once a value exists here, THIS
 * is the source of truth for the site, the earnings calculator and accrual.
 *
 * Changing a rate never rewrites history: every commission row snapshots the
 * rate it was accrued at (see `commissions.rate`).
 */
export interface AffiliateRates {
  year1: number; // share for months 1–12
  lifetime: number; // share from month 13
  minPayoutInr: number;
  attributionDays: number;
}

export const DEFAULT_RATES: AffiliateRates = {
  year1: 0.25,
  lifetime: 0.12,
  minPayoutInr: 500,
  attributionDays: 90,
};

const num = (v: string | null, fallback: number) => {
  // Number(null) is 0, which is finite and >= 0 — so an unset setting would
  // silently become a 0% commission rate. Reject empty explicitly first.
  if (v === null || v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

export async function getRates(db: D1Database): Promise<AffiliateRates> {
  try {
    const [y1, lt, mp, ad] = await Promise.all([
      getSetting(db, "aff_rate_year1"),
      getSetting(db, "aff_rate_lifetime"),
      getSetting(db, "aff_min_payout"),
      getSetting(db, "aff_attribution_days"),
    ]);
    return {
      year1: num(y1, DEFAULT_RATES.year1),
      lifetime: num(lt, DEFAULT_RATES.lifetime),
      minPayoutInr: num(mp, DEFAULT_RATES.minPayoutInr),
      attributionDays: num(ad, DEFAULT_RATES.attributionDays),
    };
  } catch {
    return DEFAULT_RATES;
  }
}

export async function saveRates(db: D1Database, r: Partial<AffiliateRates>): Promise<void> {
  // Rates arrive as percentages from the cockpit; clamp so a typo can't create
  // a 300% commission.
  if (r.year1 !== undefined) {
    await setSetting(db, "aff_rate_year1", String(Math.min(1, Math.max(0, r.year1))));
  }
  if (r.lifetime !== undefined) {
    await setSetting(db, "aff_rate_lifetime", String(Math.min(1, Math.max(0, r.lifetime))));
  }
  if (r.minPayoutInr !== undefined) {
    await setSetting(db, "aff_min_payout", String(Math.max(0, Math.round(r.minPayoutInr))));
  }
  if (r.attributionDays !== undefined) {
    await setSetting(db, "aff_attribution_days", String(Math.max(1, Math.round(r.attributionDays))));
  }
}

/**
 * Which rate applies for a payment, given when the customer converted.
 * Months 1–12 earn the year-1 rate; month 13 onward earns the lifetime rate.
 */
export function rateForMonth(rates: AffiliateRates, convertedAt: string | null, period: string): number {
  if (!convertedAt) return rates.year1;
  const start = new Date(convertedAt);
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return rates.year1;
  const months = (y - start.getFullYear()) * 12 + (m - (start.getMonth() + 1));
  return months < 12 ? rates.year1 : rates.lifetime;
}
