/**
 * Affiliate config — SINGLE SOURCE OF TRUTH for partner money (BUILD_SPEC §10A/§16).
 * ⚠️ Confirm PLANS prices/caps against `GoLuQ_Pricing_Model.xlsx` before launch.
 * Keep this ↔ the spec §16 table ↔ the workbook in sync.
 */

export const RATE_YEAR1 = 0.35; // affiliate share, months 1–12
export const RATE_LIFETIME = 0.12; // affiliate share, month 13+
export const ATTRIBUTION_DAYS = 90; // last-click window
export const MIN_PAYOUT_INR = 500;

export interface Plan {
  id: string;
  priceInr: number;
  cap: string; // included fair-use quota / month
  labelKey: string; // i18n: t(labelKey)
}

export const PLANS: Plan[] = [
  { id: "reception", priceInr: 799, cap: "1,500 conversations", labelKey: "plans.reception" },
  { id: "support", priceInr: 999, cap: "2,000 conversations", labelKey: "plans.support" },
  { id: "sales", priceInr: 1499, cap: "3,000 conversations", labelKey: "plans.sales" },
  { id: "voiceLite", priceInr: 4999, cap: "1,200 call-minutes", labelKey: "plans.voiceLite" },
  { id: "voicePro", priceInr: 6999, cap: "2,500 call-minutes", labelKey: "plans.voicePro" },
  { id: "workforce", priceInr: 9999, cap: "2,000 mins + 3–4k chats", labelKey: "plans.workforce" },
];

export const DEFAULT_PLAN_ID = "sales";

export function planById(id: string): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[2];
}
