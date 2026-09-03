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
  /**
   * What to SHOW this visitor, already converted by the server. `fromInr` stays
   * the rupee figure the owner typed in the cockpit; these are the same prices
   * in the money the visitor thinks in. Always display these two.
   */
  from: number;
  offer: number | null;
  /** 'build' = software we make · 'comms' = telecom we provision. */
  category: string;
}

export interface MarketInfo {
  country: string;
  currency: string;
  locale: string;
  isIndia: boolean;
}

const INR_MARKET: MarketInfo = { country: "IN", currency: "INR", locale: "en-IN", isIndia: true };

/** Rupee fallback for the voice plan when the server cannot be reached. */
const VOICE_LITE_INR = 4999;

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
  /** Which currency this visitor is priced in. */
  market: MarketInfo;
  /** Prices quoted outside the catalogue, already converted by the server. */
  extras: { voiceLite: number };
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
    from: o.fromInr,
    offer: null,
    category: "build",
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
      // A visitor who has explicitly picked a country overrides geography.
      let picked = "";
      try {
        picked = localStorage.getItem("goluq_country") || "";
      } catch {
        /* private mode — geography still applies */
      }
      const r = await fetch("/api/config", {
        headers: picked ? { "x-country": picked } : undefined,
      });
      const d = await r.json();
      // A server that predates market pricing sends no `from`, which would
      // render as "undefined" in place of every price. Fall back to the rupee
      // figure rather than showing nothing.
      const pricing: LivePrice[] =
        Array.isArray(d?.pricing) && d.pricing.length
          ? d.pricing.map((p: LivePrice) => ({
              ...p,
              from: typeof p.from === "number" ? p.from : p.fromInr,
              offer: typeof p.offer === "number" ? p.offer : p.offerInr,
              category: p.category || "build",
            }))
          : fromLocal();
      // Owner-edited copy is applied before anything renders off it.
      applyContentOverrides(d?.content);
      cache = {
        whatsapp: String(d?.whatsapp || ""),
        chatEnabled: d?.chatEnabled !== false,
        announcement: String(d?.announcement || ""),
        pricing,
        affiliate: d?.affiliate,
        country: String(d?.country || ""),
        market: (d?.market as MarketInfo) || INR_MARKET,
        extras: { voiceLite: Number(d?.extras?.voiceLite) || VOICE_LITE_INR },
      };
    } catch {
      cache = {
        whatsapp: "", chatEnabled: true, announcement: "",
        pricing: fromLocal(), country: "", market: INR_MARKET,
        extras: { voiceLite: VOICE_LITE_INR },
      };
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

/**
 * Format a price for THIS visitor.
 *
 * Takes an amount the server has ALREADY converted (a `from` or `offer` field)
 * and only decides how to print it. It deliberately cannot convert: doing the
 * arithmetic in the browser as well as on the server is exactly how a page ends
 * up disagreeing with the guide that just quoted it.
 */
export function useMoney(): (amount: number) => string {
  const cfg = useSiteConfig();
  const m = cfg?.market ?? INR_MARKET;
  return (amount: number) => {
    try {
      return new Intl.NumberFormat(m.locale, {
        style: "currency",
        currency: m.currency,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return m.currency + " " + Math.round(amount);
    }
  };
}
