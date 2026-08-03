/**
 * THE CATALOGUE — single source of truth for "what GoLuQ builds and what it costs".
 *
 * The positioning this encodes: GoLuQ is not a Digital Employee vendor that also
 * does custom work. It builds and deploys ANYTHING that runs on a computer, a
 * laptop or a phone — and Digital Employees are one item on that list, not the
 * headline act.
 *
 * Consumed by: the homepage capability tabs, the /build pages, and the
 * conversational concierge's system prompt (so the guide can quote the same
 * ladder a visitor sees on screen — never a number it invented).
 *
 * PRICING STRATEGY (owner's directive, 2026-08-03): undercut the incumbent by
 * enough that switching becomes obvious. An Indian business already paying for
 * software won't move for a 10% saving — it moves when the number is so much
 * lower that staying looks irrational. Every starting price here is set to be
 * the cheapest credible entry in its category.
 *
 * ⚠️ All figures below are OWNER-CONFIRMED except `digitalEmployee`, whose
 * monthly plan price comes from content/affiliateConfig.ts PLANS.
 *
 * ⚠️ HONESTY NOTE on `digitalEmployee`: this product is NOT built yet. Every
 * claim about it must describe what we would build to order — never an
 * off-the-shelf thing that "deploys instantly". The on-site simulation is a
 * demonstration of intended behaviour, and is labelled as such. Do not
 * reintroduce "deploys in under a minute" anywhere.
 */

export type TierId =
  | "automation"
  | "whatsapp"
  | "digitalEmployee"
  | "website"
  | "app"
  | "offline"
  | "platform";

export interface Offering {
  id: TierId;
  /** Entry price in INR. `recurring` marks it as per-month rather than one-time. */
  fromInr: number;
  recurring?: boolean;
  confirmed: boolean;
  /** Rough delivery window, shown so "custom" doesn't read as "open-ended". */
  leadTime: string;
  /** Which funnel this tab hands off to. */
  cta: "demo" | "build" | "enquiry";
}

export const CATALOGUE: Offering[] = [
  { id: "automation", fromInr: 3_000, confirmed: true, leadTime: "4–8 days", cta: "enquiry" },
  { id: "whatsapp", fromInr: 3_000, confirmed: true, leadTime: "4–8 days", cta: "enquiry" },
  {
    id: "digitalEmployee",
    fromInr: 799,
    recurring: true,
    confirmed: true,
    // Built to order per business: requirements, build, then testing against the
    // client's real cases. Anything faster than this would be a promise we can't keep.
    leadTime: "2–4 weeks to build & test",
    cta: "demo",
  },
  { id: "website", fromInr: 10_000, confirmed: true, leadTime: "7–10 days", cta: "build" },
  { id: "app", fromInr: 50_000, confirmed: true, leadTime: "4–10 days", cta: "build" },
  { id: "offline", fromInr: 50_000, confirmed: true, leadTime: "4–10 days", cta: "build" },
  { id: "platform", fromInr: 150_000, confirmed: true, leadTime: "4–10 weeks", cta: "build" },
];

export function offeringById(id: TierId): Offering {
  return CATALOGUE.find((o) => o.id === id) ?? CATALOGUE[0];
}

/** The cheapest entry point across the catalogue — powers the "starts at" hook. */
export const ENTRY_PRICE_INR = Math.min(
  ...CATALOGUE.filter((o) => !o.recurring).map((o) => o.fromInr)
);

export function inr(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Compact catalogue summary injected into the concierge's system prompt, so the
 * guide quotes exactly what the page shows. Regenerated from CATALOGUE, never
 * hand-maintained in parallel — a drift here becomes a wrong price in a sales
 * conversation.
 */
export function catalogueForPrompt(labels: Record<string, string>): string {
  return CATALOGUE.map((o) => {
    const price = o.recurring ? `from ${inr(o.fromInr)}/month` : `from ${inr(o.fromInr)} one-time`;
    return `- ${labels[o.id] ?? o.id}: ${price}, typically ${o.leadTime}`;
  }).join("\n");
}
