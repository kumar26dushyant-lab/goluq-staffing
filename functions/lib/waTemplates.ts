/// <reference types="@cloudflare/workers-types" />

import { waSendTemplate, type WaConfig, type WaResult } from "./whatsapp";

/**
 * The approved template names, in one place.
 *
 * A template is the ONLY thing that reaches someone outside the 24-hour service
 * window, and its text is fixed at approval time — so unlike the guide's replies,
 * nothing here can be improvised. Variables are the only moving parts.
 *
 * See docs/whatsapp-templates.md for the exact approved wording.
 */
export const WA_TEMPLATES = {
  /** {{1}} name · {{2}} what they asked about */
  enquiryReceived: "enquiry_received",
  /** {{1}} name · {{2}} what for · {{3}} price · {{4}} lead time */
  quoteReady: "quote_ready",
  /** {{1}} name · {{2}} project · {{3}} stage */
  projectStage: "project_stage_update",
  /** {{1}} name · {{2}} service · {{3}} number it is live on */
  serviceActivated: "service_activated",
  /** {{1}} name · {{2}} what they asked about */
  followupNoReply: "followup_no_reply",
} as const;

/** Meta rejects a send outright when that name+language pair is not approved. */
function isLanguageProblem(error: string): boolean {
  return /132001|does not exist|not found|not been approved|no matching|translation/i.test(error);
}

/**
 * Send a template, falling back to the other language if the preferred one is
 * not approved yet.
 *
 * Approval is per name AND language, and the two rarely land together — at the
 * time of writing three Hindi variants were still in review while their English
 * counterparts were live. Without this, a Hindi-speaking lead would simply
 * receive nothing, which is indistinguishable from the system being broken.
 *
 * Only language errors trigger a retry. A bad number or a closed window is a
 * real failure and is returned as-is rather than being retried in every
 * language we have.
 */
export async function sendTemplate(
  cfg: WaConfig,
  to: string,
  name: string,
  lang: "en" | "hi",
  params: string[] = []
): Promise<WaResult> {
  const candidates = lang === "hi" ? ["hi", "en", "en_US"] : ["en", "en_US", "hi"];

  let last: WaResult = { ok: false, error: "not_attempted" };
  for (const code of candidates) {
    last = await waSendTemplate(cfg, to, name, code, params);
    if (last.ok) return last;
    if (!isLanguageProblem(last.error)) return last;
  }
  return last;
}
