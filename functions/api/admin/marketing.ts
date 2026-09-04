/// <reference types="@cloudflare/workers-types" />

import { checkAdmin, unauthorized } from "../../lib/admin";
import { geminiText, geminiEnabled, type GeminiEnv } from "../../lib/gemini";
import { getPricing } from "../../lib/pricing";

interface Env extends GeminiEnv {
  DB: D1Database;
  ADMIN_SECRET: string;
}

/** The fields a card is drawn from. Everything is optional except the title. */
export interface PostCopy {
  eyebrow: string;
  title: string;
  accent: string;
  body: string;
  bullets: string[];
  kicker: string;
  cta: string;
}

/**
 * Write one social post from a plain-language brief.
 *
 * The owner types what he wants to say — "post about the toll-free offer for
 * clinics, in Hinglish" — and gets the fields a card is drawn from. The value
 * is not the writing; it is that the writing arrives already fitted to the
 * layout, with a headline short enough to survive at 84px and a body that does
 * not overflow the card.
 *
 * Real prices are injected, so a generated post can never quote a number the
 * site does not charge. That is the same rule the guide follows.
 */
const SYSTEM = (catalogue: string) => `You write social media posts for GoLuQ (goluq.com), a one-person software and business-communication practice in Indore, India.

WHAT GOLUQ DOES
Builds custom software — websites, apps, offline software, multi-branch platforms, WhatsApp and workflow automations, Digital Employees — AND provisions business communication: toll-free 1800 numbers, WhatsApp Business API, IVR, voice campaigns, SMS, missed-call.

THE POSITIONING, which every post should trace back to
"Most vendors hand you a login. We build what runs behind it." A number does nothing on its own; the value is what happens when it rings. Customers own what they buy — a one-time cost instead of a subscription that never ends.

REAL PRICES — never invent others:
${catalogue}

REAL PROOF — never invent others:
- NidaanPartner.com: 4 offices, 2,000+ claims settled, 5,000+ policyholders assisted, 95%+ success rate. Software GoLuQ built end to end.
- Sarathi-AI.com and EagleEye.work are also live and built by GoLuQ.
- GoLuQ's own WhatsApp number answers in seconds, 24x7, on the official API.
- Founder: Dushyant Sharma, 20+ years in operations at Genpact, DXC, Hexaware, Cornerstone OnDemand, Definitive Healthcare and HighLevel.

THE AUDIENCE
Business owners in tier-2 and tier-3 Indian cities. Clinics, coaching institutes, CA firms, distributors, hotels, transport, retail chains. They are NOT technical. They respond to a specific daily headache — the billing man taking two days off, udhaar they hate chasing, the business running on staff's personal WhatsApp, forty-two calls during a family wedding — and to money saved. They do not respond to the words "automation", "AI", "digital transformation" or "solutions".

HARD RULES
- NEVER use the words AI, ML, model, chatbot, bot, artificial intelligence, or "solutions".
- NEVER invent a price, a statistic, a client name or a guarantee.
- Be specific. "Two thousand claims settled" beats "trusted by many".
- Say the uncomfortable thing when it is true — it is why this brand is believed.

OUTPUT
Return ONLY a JSON object, no markdown fence, no commentary:
{
  "eyebrow": "3-6 words, ALL CAPS, the category or hook",
  "title": "the first half of the headline, max 8 words",
  "accent": "the second half of the headline, max 8 words — this renders in the brand gradient, so put the payoff here",
  "body": "one or two short sentences, max 25 words total",
  "bullets": ["optional, 0 to 3 items, max 9 words each"],
  "kicker": "optional one-line punch, max 14 words, or empty string",
  "cta": "optional short call to action, max 6 words, or empty string"
}
Keep the headline SHORT. It is set at 84px on a square image; anything long becomes unreadable.`;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await checkAdmin(request, env))) return unauthorized();
  if (!geminiEnabled(env)) {
    return Response.json({ ok: false, error: "Gemini is not configured on this server." });
  }
  try {
    const b = await request.json<{ prompt?: string; lang?: string }>();
    const brief = String(b.prompt || "").trim().slice(0, 600);
    if (!brief) return Response.json({ ok: false, error: "Say what the post should be about." });
    const lang = String(b.lang || "en");

    // Live prices, so a post cannot quote a figure the site does not charge.
    let catalogue = "(price list unavailable)";
    try {
      const rows = await getPricing(env.DB);
      catalogue = rows
        .filter((r) => r.enabled)
        .map((r) => `- ${r.id}: Rs ${r.price_inr}${r.recurring ? "/month" : " one-time"}, ${r.lead_time}`)
        .join("\n");
    } catch {
      /* the model is told to invent nothing, so an empty list is safe */
    }

    const langLine =
      lang === "hi"
        ? "Write in Hindi (Devanagari)."
        : lang === "hinglish"
          ? "Write in Hinglish — Hindi written in Roman script, the way business owners actually message each other. Natural, not translated."
          : "Write in English.";

    const raw = await geminiText(
      env,
      `${SYSTEM(catalogue)}\n\n${langLine}\n\nBRIEF FROM THE OWNER:\n${brief}\n\nJSON:`,
      700
    );

    // Models wrap JSON in fences no matter how firmly they are asked not to.
    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start) {
      return Response.json({ ok: false, error: "Could not read a post out of that. Try rephrasing." });
    }

    let parsed: Partial<PostCopy>;
    try {
      parsed = JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return Response.json({ ok: false, error: "Could not read a post out of that. Try rephrasing." });
    }

    const str = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);
    const copy: PostCopy = {
      eyebrow: str(parsed.eyebrow, 60).toUpperCase(),
      title: str(parsed.title, 90),
      accent: str(parsed.accent, 90),
      body: str(parsed.body, 220),
      bullets: Array.isArray(parsed.bullets) ? parsed.bullets.slice(0, 3).map((x) => str(x, 70)) : [],
      kicker: str(parsed.kicker, 120),
      cta: str(parsed.cta, 40),
    };
    if (!copy.title && !copy.accent) {
      return Response.json({ ok: false, error: "That came back empty. Try a more specific brief." });
    }
    return Response.json({ ok: true, copy });
  } catch (e) {
    console.log("marketing generate failed:", String(e).slice(0, 200));
    return Response.json({ ok: false, error: "server" }, { status: 500 });
  }
};
