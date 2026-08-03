/**
 * Custom-build economics — SINGLE SOURCE OF TRUTH for the /build pages.
 *
 * These drive the rent-vs-own calculator, the TCO table framing, and the price
 * band shown on the page. Publishing a band (rather than "contact us") is a
 * deliberate CRO decision: unqualified visitors self-select out, qualified ones
 * stop bouncing.
 *
 * Bands are set to undercut the incumbent decisively rather than to price at
 * market — see the strategy note in content/catalogue.ts. The India floor
 * matches the `platform` entry there (₹1,50,000) and must move with it.
 *
 * The global band is NOT a currency conversion of the India band. It sits above
 * it (a US/UK/AU/UAE engagement carries real overhead India doesn't) while still
 * landing far under what an agency in those markets quotes — which is the whole
 * argument the page makes.
 */

export type Region = "in" | "global";

export interface BuildEconomics {
  currency: string;
  /** Intl locale used for currency + number formatting. */
  locale: string;
  /** One-time build cost band, in major currency units. */
  bandLow: number;
  bandHigh: number;
  /** Calculator defaults — seats, per-seat monthly cost, horizon in years. */
  defaultSeats: number;
  defaultPerSeat: number;
  defaultYears: number;
  /** Slider bounds. */
  maxSeats: number;
  maxPerSeat: number;
  /** Monthly cloud hosting band the client pays directly, at cost. */
  hostingLow: number;
  hostingHigh: number;
  /**
   * Seat count below which we openly recommend buying off-the-shelf instead.
   * Conceding the case we'd lose anyway is what makes the rest credible.
   */
  honestFloorSeats: number;
}

export const ECONOMICS: Record<Region, BuildEconomics> = {
  in: {
    currency: "INR",
    locale: "en-IN",
    bandLow: 150_000,
    bandHigh: 600_000,
    // Defaults describe a firm that SHOULD build (15 seats). Dial seats down and
    // the verdict honestly flips to "keep renting" — that's the intended behaviour,
    // not a bug. Keep these in sync with the buildIn.tco lede + first row.
    defaultSeats: 15,
    defaultPerSeat: 1_800,
    defaultYears: 3,
    maxSeats: 100,
    maxPerSeat: 5_000,
    hostingLow: 2_000,
    hostingHigh: 15_000,
    honestFloorSeats: 8,
  },
  global: {
    currency: "USD",
    locale: "en-US",
    bandLow: 6_000,
    bandHigh: 30_000,
    defaultSeats: 25,
    defaultPerSeat: 95,
    defaultYears: 5,
    maxSeats: 250,
    maxPerSeat: 400,
    hostingLow: 80,
    hostingHigh: 600,
    honestFloorSeats: 15,
  },
};

/** Currency with no decimals — these are all four- to seven-figure numbers. */
export function money(value: number, e: BuildEconomics): string {
  return new Intl.NumberFormat(e.locale, {
    style: "currency",
    currency: e.currency,
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

/** Total per-seat licence spend over the horizon. */
export function rentTotal(seats: number, perSeat: number, years: number): number {
  return seats * perSeat * 12 * years;
}
