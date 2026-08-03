/// <reference types="@cloudflare/workers-types" />

/**
 * Server-side view of the catalogue.
 *
 * SEED values mirror src/content/catalogue.ts and are inserted on first read, so
 * a fresh database comes up with the real price list rather than an empty one.
 * After that the `pricing` table wins — which is what makes prices, lead times
 * and offers editable from the cockpit without a deploy.
 */
export interface PriceRow {
  id: string;
  price_inr: number;
  recurring: number;
  lead_time: string;
  enabled: number;
  offer_label: string | null;
  offer_price_inr: number | null;
  sort_order: number;
}

const SEED: Omit<PriceRow, "offer_label" | "offer_price_inr">[] = [
  { id: "automation", price_inr: 3000, recurring: 0, lead_time: "4–8 days", enabled: 1, sort_order: 1 },
  { id: "whatsapp", price_inr: 3000, recurring: 0, lead_time: "4–8 days", enabled: 1, sort_order: 2 },
  { id: "digitalEmployee", price_inr: 799, recurring: 1, lead_time: "2–4 weeks to build & test", enabled: 1, sort_order: 3 },
  { id: "website", price_inr: 10000, recurring: 0, lead_time: "7–10 days", enabled: 1, sort_order: 4 },
  { id: "app", price_inr: 50000, recurring: 0, lead_time: "4–10 days", enabled: 1, sort_order: 5 },
  { id: "offline", price_inr: 50000, recurring: 0, lead_time: "4–10 days", enabled: 1, sort_order: 6 },
  { id: "platform", price_inr: 150000, recurring: 0, lead_time: "4–10 weeks", enabled: 1, sort_order: 7 },
];

/** English labels for the guide's prompt — the SPA has its own i18n copies. */
export const TIER_LABELS: Record<string, string> = {
  automation: "Software & Workflow Automations",
  whatsapp: "WhatsApp & Communication Automations",
  digitalEmployee: "Digital Employees",
  website: "Websites & Web Applications",
  app: "Mobile & Desktop Apps",
  offline: "Zero-Internet Local Software",
  platform: "Custom Platforms & Multi-Branch Systems",
};

export async function getPricing(db: D1Database): Promise<PriceRow[]> {
  const res = await db
    .prepare(`SELECT * FROM pricing ORDER BY sort_order, id`)
    .all<PriceRow>();
  let rows = res.results ?? [];

  if (rows.length === 0) {
    for (const s of SEED) {
      await db
        .prepare(
          `INSERT OR IGNORE INTO pricing
             (id, price_inr, recurring, lead_time, enabled, sort_order, updated_at)
           VALUES (?,?,?,?,?,?,datetime('now'))`
        )
        .bind(s.id, s.price_inr, s.recurring, s.lead_time, s.enabled, s.sort_order)
        .run();
    }
    rows = (await db.prepare(`SELECT * FROM pricing ORDER BY sort_order, id`).all<PriceRow>())
      .results ?? [];
  }
  return rows;
}

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

/**
 * The price list the guide is allowed to quote, generated from the live table so
 * a cockpit edit reaches the conversation immediately.
 */
export function catalogueForPrompt(rows: PriceRow[]): string {
  return rows
    .filter((r) => r.enabled)
    .map((r) => {
      const label = TIER_LABELS[r.id] ?? r.id;
      const base = r.recurring ? `from ${inr(r.price_inr)}/month` : `from ${inr(r.price_inr)} one-time`;
      const offer =
        r.offer_label && r.offer_price_inr
          ? ` — CURRENT OFFER: ${r.offer_label}, ${inr(r.offer_price_inr)}. Mention this offer when it is relevant.`
          : r.offer_label
            ? ` — CURRENT OFFER: ${r.offer_label}.`
            : "";
      return `- ${label}: ${base}, typically ${r.lead_time}${offer}`;
    })
    .join("\n");
}
