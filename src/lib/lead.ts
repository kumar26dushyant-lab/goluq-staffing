import { getActiveRef } from "./refAttribution";
import type { RoleId, IndustryId } from "../state/useAppState";

export interface LeadPayload {
  name: string;
  phone: string;
  email?: string;
  message?: string;
  role?: RoleId;
  industry?: IndustryId;
  crossSell: string[];
  wantsTraining: boolean;
}

/**
 * Optional WhatsApp fallback so a lead is never lost if the API is unreachable.
 * The number is NOT hardcoded — it comes from /api/config (admin-set); if none is
 * configured the caller simply hides the WhatsApp option.
 */
export function whatsappHref(number: string, p: Partial<LeadPayload>): string {
  const digits = (number || "").replace(/\D/g, "");
  const lines = [
    "Hi GoLuQ — I'd like a free Digital Employee trial.",
    p.name ? `Name: ${p.name}` : "",
    p.phone ? `Phone: +91 ${p.phone}` : "",
    p.role ? `Role: ${p.role}` : "",
    p.industry ? `Industry: ${p.industry}` : "",
  ].filter(Boolean);
  return `https://wa.me/${digits}?text=${encodeURIComponent(lines.join("\n"))}`;
}

/** Public site config (business WhatsApp, etc.) — no secrets. */
export async function fetchPublicConfig(): Promise<{ whatsapp: string }> {
  try {
    const r = await fetch("/api/config");
    const d = await r.json();
    return { whatsapp: (d?.whatsapp as string) || "" };
  } catch {
    return { whatsapp: "" };
  }
}

/**
 * POST the lead to the Cloudflare Pages Function (Phase F). Includes affiliate
 * `ref` (last-click) automatically. Throws on non-2xx so the UI can show the
 * error + retry + WhatsApp fallback.
 */
export async function submitLead(payload: LeadPayload): Promise<void> {
  const res = await fetch("/api/lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, ref: getActiveRef() }),
  });
  if (!res.ok) throw new Error(`lead failed: ${res.status}`);
}
