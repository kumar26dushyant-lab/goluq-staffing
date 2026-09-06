/// <reference types="@cloudflare/workers-types" />

import { getSetting, setSetting } from "./settings";

/**
 * Affiliate economics — owner-editable, because these are commercial terms that
 * change, not constants. src/content/affiliateConfig.ts holds the same defaults
 * and remains the offline fallback for the SPA; once a value exists here, THIS
 * is the source of truth for the site, the earnings calculator and accrual.
 *
 * The model (decided 2026-09-06): GoLuQ sells one-time builds, so a partner
 * earns a share of GoLuQ's PROFIT on each project they introduced — the price
 * minus what it cost to deliver — paid as the customer pays. Enhancements that
 * customer orders within a window earn the same share; maintenance never does.
 * The commission comes out of the margin, so the price a customer sees is the
 * same whether a partner was involved or not.
 *
 * Changing a rate never rewrites history: every commission row snapshots the
 * rate it was accrued at (see `commissions.rate`).
 */
export interface AffiliateRates {
  /** Share of profit, 0–1. */
  rate: number;
  /** Months after the first project during which enhancements still earn. */
  enhancementMonths: number;
  /** Margin the public calculator ASSUMES, since it cannot know a real cost. */
  typicalMargin: number;
  minPayoutInr: number;
  attributionDays: number;
}

export const DEFAULT_RATES: AffiliateRates = {
  rate: 0.2,
  enhancementMonths: 24,
  typicalMargin: 0.4,
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
    const [rate, legacy, enh, margin, mp, ad] = await Promise.all([
      getSetting(db, "aff_rate"),
      // The rate the cockpit saved under the old recurring model, so a value the
      // owner already set is not silently replaced by a default.
      getSetting(db, "aff_rate_year1"),
      getSetting(db, "aff_enh_months"),
      getSetting(db, "aff_typical_margin"),
      getSetting(db, "aff_min_payout"),
      getSetting(db, "aff_attribution_days"),
    ]);
    return {
      rate: num(rate, num(legacy, DEFAULT_RATES.rate)),
      enhancementMonths: num(enh, DEFAULT_RATES.enhancementMonths),
      typicalMargin: num(margin, DEFAULT_RATES.typicalMargin),
      minPayoutInr: num(mp, DEFAULT_RATES.minPayoutInr),
      attributionDays: num(ad, DEFAULT_RATES.attributionDays),
    };
  } catch {
    return DEFAULT_RATES;
  }
}

export async function saveRates(db: D1Database, r: Partial<AffiliateRates>): Promise<void> {
  // Rates arrive as fractions from the cockpit; clamp so a typo can't create
  // a 300% commission.
  const frac = (n: number) => String(Math.min(1, Math.max(0, n)));
  if (r.rate !== undefined && Number.isFinite(r.rate)) await setSetting(db, "aff_rate", frac(r.rate));
  if (r.typicalMargin !== undefined && Number.isFinite(r.typicalMargin)) {
    await setSetting(db, "aff_typical_margin", frac(r.typicalMargin));
  }
  if (r.enhancementMonths !== undefined && Number.isFinite(r.enhancementMonths)) {
    await setSetting(db, "aff_enh_months", String(Math.max(0, Math.round(r.enhancementMonths))));
  }
  if (r.minPayoutInr !== undefined && Number.isFinite(r.minPayoutInr)) {
    await setSetting(db, "aff_min_payout", String(Math.max(0, Math.round(r.minPayoutInr))));
  }
  if (r.attributionDays !== undefined && Number.isFinite(r.attributionDays)) {
    await setSetting(db, "aff_attribution_days", String(Math.max(1, Math.round(r.attributionDays))));
  }
}

export type ProjectKind = "build" | "enhancement" | "maintenance";
export const PROJECT_KINDS: ProjectKind[] = ["build", "enhancement", "maintenance"];

export interface CommissionInput {
  kind: ProjectKind;
  priceInr: number;
  costInr: number;
  /** This payment, in rupees. */
  paymentInr: number;
  /** When the customer's FIRST commissionable project was opened; null if this is it. */
  firstProjectAt: string | null;
  /** When this project was opened. */
  projectAt: string;
}

export type CommissionVerdict =
  | { eligible: true; rate: number; amountInr: number; profitShare: number }
  | { eligible: false; reason: string };

/**
 * What one payment earns the partner.
 *
 * Profit is spread across the payments in proportion, so instalments add up to
 * exactly rate × (price − cost) once the project is fully paid, and a partner
 * is never paid on money that has not arrived.
 */
export function commissionFor(rates: AffiliateRates, p: CommissionInput): CommissionVerdict {
  if (p.kind === "maintenance") return { eligible: false, reason: "Maintenance is never commissioned." };
  if (p.kind === "enhancement" && p.firstProjectAt) {
    const months =
      (Date.parse(p.projectAt.replace(" ", "T") + "Z") - Date.parse(p.firstProjectAt.replace(" ", "T") + "Z")) /
      (30.44 * 24 * 3600 * 1000);
    if (Number.isFinite(months) && months > rates.enhancementMonths) {
      return { eligible: false, reason: `Outside the ${rates.enhancementMonths}-month enhancement window.` };
    }
  }
  if (!(p.priceInr > 0)) return { eligible: false, reason: "The project has no price." };
  if (!(p.paymentInr > 0)) return { eligible: false, reason: "No payment amount." };
  const profit = Math.max(0, p.priceInr - Math.max(0, p.costInr));
  if (profit === 0) return { eligible: false, reason: "No profit on this project — nothing to share." };
  const share = Math.min(1, p.paymentInr / p.priceInr);
  const amountInr = Math.round(rates.rate * profit * share);
  return { eligible: true, rate: rates.rate, amountInr, profitShare: share };
}
