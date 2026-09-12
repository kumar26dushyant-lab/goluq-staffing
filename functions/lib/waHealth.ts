/// <reference types="@cloudflare/workers-types" />

import type { WaConfig } from "./whatsapp";

/**
 * The number's standing with Meta. quality_rating is GREEN / YELLOW / RED
 * (or UNKNOWN before enough conversations); messaging_limit_tier is how many
 * new customers we may open conversations with per day. Both move on blocks
 * and reports, which is why every outbound path checks here first.
 */
export interface WaHealth {
  quality: "GREEN" | "YELLOW" | "RED" | "UNKNOWN";
  tier: string;
  raw?: string;
}

export async function waHealth(cfg: WaConfig): Promise<WaHealth> {
  if (!cfg.phoneNumberId || !cfg.accessToken) return { quality: "UNKNOWN", tier: "" };
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${cfg.phoneNumberId}?fields=quality_rating,messaging_limit_tier,throughput`,
      { headers: { Authorization: `Bearer ${cfg.accessToken}` } }
    );
    const j: any = await res.json().catch(() => ({}));
    if (!res.ok) return { quality: "UNKNOWN", tier: "", raw: String(j?.error?.message || res.status) };
    const q = String(j?.quality_rating || "UNKNOWN").toUpperCase();
    return {
      quality: q === "GREEN" || q === "YELLOW" || q === "RED" ? q : "UNKNOWN",
      tier: String(j?.messaging_limit_tier || "").replace(/^TIER_/, ""),
    };
  } catch (e) {
    return { quality: "UNKNOWN", tier: "", raw: String(e).slice(0, 120) };
  }
}

/** Marketing goes out 9:00–21:00 IST only; a reminder at 2 am is a report waiting to happen. */
export function insideSendingHours(now = new Date()): boolean {
  const h = Number(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false }));
  return h >= 9 && h < 21;
}
