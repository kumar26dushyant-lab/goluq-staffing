import { useSiteConfig } from "./siteConfig";

/**
 * Which version of the story a visitor sees.
 *
 * Same chapters everywhere; what changes is the wording (chai or coffee, a
 * 1800 number or "your business number"), the currency (already handled by the
 * market layer) and, later, the channel. `?r=` forces a region so the owner and
 * partners can validate each version before sharing it.
 */
export type Region = "in" | "gulf" | "cis" | "intl";

const GULF = new Set(["AE", "SA", "QA", "KW", "OM", "BH", "JO"]);
const CIS = new Set(["RU", "IR", "KZ", "AM", "UZ", "BY", "KG", "TJ", "TM", "AZ", "GE"]);

export function regionFor(country: string): Region {
  const c = (country || "").toUpperCase();
  if (c === "IN") return "in";
  if (GULF.has(c)) return "gulf";
  if (CIS.has(c)) return "cis";
  return "intl";
}

export function useRegion(): Region {
  const cfg = useSiteConfig();
  try {
    const q = new URLSearchParams(window.location.search).get("r");
    if (q === "in" || q === "gulf" || q === "cis" || q === "intl") return q;
  } catch {
    /* no window during prerender */
  }
  // An unknown country reads as India: that is where the business is, and a
  // rupee price shown to a foreigner is a smaller error than a dollar price
  // shown to an Indian.
  return regionFor(cfg?.country || "IN");
}
