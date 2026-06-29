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

/** Optional WhatsApp fallback so a lead is never lost if the API is unreachable. */
export const WHATSAPP_NUMBER = "919999999999"; // TODO(config): real business WhatsApp

export function whatsappHref(p: Partial<LeadPayload>): string {
  const lines = [
    "Hi GoLuQ — I'd like a free Digital Employee trial.",
    p.name ? `Name: ${p.name}` : "",
    p.phone ? `Phone: +91 ${p.phone}` : "",
    p.role ? `Role: ${p.role}` : "",
    p.industry ? `Industry: ${p.industry}` : "",
  ].filter(Boolean);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
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
