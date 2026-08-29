import { useEffect, useState } from "react";
import { CATALOGUE, type Offering } from "../content/catalogue";
import { applyContentOverrides } from "./content";

export interface LivePrice {
  /**
   * Deliberately `string`, not `TierId`. This row comes from the server, where
   * the owner can add services the front-end has never heard of — and did: the
   * comms catalogue added seven ids outside the tier union. While this was typed
   * `TierId`, every `SOMETHING[o.id]` lookup looked total to the compiler and
   * silently produced `undefined` at runtime, which took the homepage down.
   * Consumers must now narrow explicitly before indexing anything by id.
   */
  id: string;
  fromInr: number;
  recurring: boolean;
  leadTime: string;
  offerLabel: string | null;
  offerInr: number | null;
}

export interface AffiliateRates {
  year1: number;
  lifetime: number;
  minPayoutInr: number;
  attributionDays: number;
}

export interface SiteConfig {
  whatsapp: string;
  chatEnabled: boolean;
  announcement: string;
  pricing: LivePrice[];
  affiliate?: AffiliateRates;
  /** Two-letter country of the visitor, from the edge. "" when unknown. */
  country: string;
}

/** Local catalogue as a LivePrice list — the fallback if /api/config fails. */
function fromLocal(): LivePrice[] {
  return CATALOGUE.map((o: Offering) => ({
    id: o.id,
    fromInr: o.fromInr,
    recurring: !!o.recurring,
    leadTime: o.leadTime,
    offerLabel: null,
    offerInr: null,
  }));
}

let cache: SiteConfig | null = null;
let inflight: Promise<SiteConfig> | null = null;

/**
 * Site config comes from the server so the owner can change prices, offers and
 * the visitor-facing WhatsApp number from the cockpit without a deploy.
 *
 * src/content/catalogue.ts remains the seed AND the offline fallback — if the
 * API is unreachable the page still renders a correct price list rather than
 * an empty one. Cached per page load; the cockpit is the place to edit, so
 * re-fetching on every mount would be wasted traffic.
 */
export async function fetchSiteConfig(): Promise<SiteConfig> {
  if (cache) return cache;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const r = await fetch("/api/config");
      const d = await r.json();
      const pricing: LivePrice[] =
        Array.isArray(d?.pricing) && d.pricing.length ? d.pricing : fromLocal();
      // Owner-edited copy is applied before anything renders off it.
      applyContentOverrides(d?.content);
      cache = {
        whatsapp: String(d?.whatsapp || ""),
        chatEnabled: d?.chatEnabled !== false,
        announcement: String(d?.announcement || ""),
        pricing,
        affiliate: d?.affiliate,
        country: String(d?.country || ""),
      };
    } catch {
      cache = { whatsapp: "", chatEnabled: true, announcement: "", pricing: fromLocal(), country: "" };
    }
    return cache;
  })();

  return inflight;
}

export function useSiteConfig(): SiteConfig | null {
  const [cfg, setCfg] = useState<SiteConfig | null>(cache);
  useEffect(() => {
    let alive = true;
    fetchSiteConfig().then((c) => {
      if (alive) setCfg(c);
    });
    return () => {
      alive = false;
    };
  }, []);
  return cfg;
}

/** Live prices in catalogue order, with any disabled tier already removed. */
export function usePricing(): LivePrice[] {
  const cfg = useSiteConfig();
  return cfg?.pricing ?? fromLocal();
}
