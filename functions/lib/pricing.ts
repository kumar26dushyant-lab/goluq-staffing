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
  /** 'build' = software we make · 'comms' = telecom we provision · 'product' = productised offers. */
  category: string;
  /**
   * Explicit international price in USD, or null to derive one from INR × the
   * market multiplier. Set on the productised offers, where the international
   * figure is a decision rather than a conversion.
   */
  price_intl_usd: number | null;
}

/**
 * Communication services are the ACQUISITION half of the catalogue: a toll-free
 * number or a WhatsApp API is a known, budgeted purchase, which makes it an easy
 * first sale. The margin lives in the software we then build on top — see the
 * positioning note in src/content/commsCatalogue.ts.
 *
 * ⚠️ These setup prices are DEFAULTS pending confirmation against real Exotel /
 * Meta wholesale costs. Usage (call minutes, SMS, WhatsApp conversations) is
 * billed separately at cost — never fold it into the setup price.
 */
const SEED: Omit<PriceRow, "offer_label" | "offer_price_inr" | "price_intl_usd">[] = [
  { id: "automation", price_inr: 3000, recurring: 0, lead_time: "4–8 days", enabled: 1, sort_order: 1, category: "build" },
  { id: "whatsapp", price_inr: 3000, recurring: 0, lead_time: "4–8 days", enabled: 1, sort_order: 2, category: "build" },
  // Raised from 799. At 30-60 hours to build one to order, 799/month paid back
  // in four to six YEARS — the price implied an off-the-shelf product while the
  // delivery was bespoke. 2,999 pays back in under a year and is still a fifth of
  // what the receptionist it replaces costs. See docs/PRICING.md.
  { id: "digitalEmployee", price_inr: 2999, recurring: 1, lead_time: "2–4 weeks to build & test", enabled: 1, sort_order: 3, category: "build" },
  { id: "website", price_inr: 10000, recurring: 0, lead_time: "7–10 days", enabled: 1, sort_order: 4, category: "build" },
  { id: "app", price_inr: 50000, recurring: 0, lead_time: "4–10 days", enabled: 1, sort_order: 5, category: "build" },
  { id: "offline", price_inr: 50000, recurring: 0, lead_time: "4–10 days", enabled: 1, sort_order: 6, category: "build" },
  { id: "platform", price_inr: 150000, recurring: 0, lead_time: "4–10 weeks", enabled: 1, sort_order: 7, category: "build" },

  // ── Business communication (provisioned, not built) ──────────────────────
  { id: "tollfree", price_inr: 9999, recurring: 0, lead_time: "3–7 working days", enabled: 1, sort_order: 11, category: "comms" },
  { id: "virtualNumber", price_inr: 4999, recurring: 0, lead_time: "1–3 working days", enabled: 1, sort_order: 12, category: "comms" },
  { id: "waApi", price_inr: 7999, recurring: 0, lead_time: "3–7 working days", enabled: 1, sort_order: 13, category: "comms" },
  { id: "voiceCampaign", price_inr: 9999, recurring: 0, lead_time: "2–5 working days", enabled: 1, sort_order: 14, category: "comms" },
  { id: "txnSms", price_inr: 5999, recurring: 0, lead_time: "3–7 working days", enabled: 1, sort_order: 15, category: "comms" },
  { id: "promoSms", price_inr: 5999, recurring: 0, lead_time: "3–7 working days", enabled: 1, sort_order: 16, category: "comms" },
  { id: "missedCall", price_inr: 3999, recurring: 0, lead_time: "1–3 working days", enabled: 1, sort_order: 17, category: "comms" },

  // ── Productised offers — the revenue, as opposed to the wedge ─────────────
  // One product, one price, one delivery date. The Office is workflow for a
  // professional-services firm; the Store is catalogue broadcast plus native
  // WhatsApp ordering for a wholesaler. Same engine, same price band. Each has
  // a managed plan, which is the only recurring revenue in the business and the
  // thing that makes a partner trail commission honest.
  { id: "whatsappOffice", price_inr: 100000, recurring: 0, lead_time: "21 days", enabled: 1, sort_order: 21, category: "product" },
  { id: "officeManaged", price_inr: 10000, recurring: 1, lead_time: "from handover", enabled: 1, sort_order: 22, category: "product" },
  { id: "whatsappStore", price_inr: 100000, recurring: 0, lead_time: "21 days", enabled: 1, sort_order: 23, category: "product" },
  { id: "storeManaged", price_inr: 10000, recurring: 1, lead_time: "from handover", enabled: 1, sort_order: 24, category: "product" },
];

/** International prices for the productised offers. Decisions, not conversions. */
const SEED_INTL_USD: Record<string, number> = {
  whatsappOffice: 2900,
  officeManaged: 490,
  whatsappStore: 2900,
  storeManaged: 490,
};

/** English labels for the guide's prompt — the SPA has its own i18n copies. */
export const TIER_LABELS: Record<string, string> = {
  automation: "Software & Workflow Automations",
  whatsapp: "WhatsApp & Communication Automations",
  digitalEmployee: "Digital Employees",
  website: "Websites & Web Applications",
  app: "Mobile & Desktop Apps",
  offline: "Zero-Internet Local Software",
  platform: "Custom Platforms & Multi-Branch Systems",
  tollfree: "Toll-Free Number (1800)",
  virtualNumber: "Virtual Business Number & IVR",
  waApi: "WhatsApp Business API",
  voiceCampaign: "Voice Campaigns (Press-1, Bulk, DTMF)",
  txnSms: "Transactional SMS",
  promoSms: "Promotional SMS",
  missedCall: "Missed-Call Service",
  whatsappOffice: "The WhatsApp Office (complete setup, 21 days)",
  officeManaged: "WhatsApp Office — managed plan",
  whatsappStore: "The WhatsApp Store (catalogue + ordering, 21 days)",
  storeManaged: "WhatsApp Store — managed plan",
};

export async function getPricing(db: D1Database): Promise<PriceRow[]> {
  const res = await db
    .prepare(`SELECT * FROM pricing ORDER BY sort_order, id`)
    .all<PriceRow>();
  let rows = res.results ?? [];

  // Insert any seed row that is not present yet. Checking for an empty table
  // instead would mean new services never reach a database that already has the
  // old ones — which is every deployed database.
  const have = new Set(rows.map((r) => r.id));
  const missing = SEED.filter((s) => !have.has(s.id));
  if (missing.length) {
    for (const s of missing) {
      await db
        .prepare(
          `INSERT OR IGNORE INTO pricing
             (id, price_inr, recurring, lead_time, enabled, sort_order, category, price_intl_usd, updated_at)
           VALUES (?,?,?,?,?,?,?,?,datetime('now'))`
        )
        .bind(s.id, s.price_inr, s.recurring, s.lead_time, s.enabled, s.sort_order, s.category, SEED_INTL_USD[s.id] ?? null)
        .run();
    }
    rows = (await db.prepare(`SELECT * FROM pricing ORDER BY sort_order, id`).all<PriceRow>())
      .results ?? [];
  }
  return rows;
}

/**
 * Prices the site quotes that do NOT live in the pricing table — the voice plan
 * in particular. Kept here so they go through the same market conversion as
 * everything else; a rupee constant formatted as dollars reads as $4,999.
 */
export const EXTRA_PRICES = {
  voiceLite: 4999,
} as const;

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

/**
 * The price list the guide is allowed to quote, generated from the live table so
 * a cockpit edit reaches the conversation immediately.
 */
export function catalogueForPrompt(
  rows: PriceRow[],
  money: (row: PriceRow, inrAmount: number) => string = (_r, n) => inr(n)
): string {
  return rows
    .filter((r) => r.enabled)
    .map((r) => {
      const label = TIER_LABELS[r.id] ?? r.id;
      const base = r.recurring
        ? `from ${money(r, r.price_inr)}/month`
        : `from ${money(r, r.price_inr)} one-time`;
      const offer =
        r.offer_label && r.offer_price_inr
          ? ` — CURRENT OFFER: ${r.offer_label}, ${money(r, r.offer_price_inr)}. Mention this offer when it is relevant.`
          : r.offer_label
            ? ` — CURRENT OFFER: ${r.offer_label}.`
            : "";
      return `- ${label}: ${base}, typically ${r.lead_time}${offer}`;
    })
    .join("\n");
}
