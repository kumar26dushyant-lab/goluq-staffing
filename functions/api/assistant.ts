/// <reference types="@cloudflare/workers-types" />

import { conciergeReply, conciergeFallback, type ConciergeEnv, type ConciergeMsg } from "../lib/concierge";

type Env = ConciergeEnv;

/**
 * Website side of the GoLuQ guide.
 *
 * The persona, the live price list and the honesty rules all live in
 * functions/lib/concierge.ts, shared with the WhatsApp channel — this handler
 * only decides what the visitor is looking at and hands that over as context.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = await request.json<{ messages?: ConciergeMsg[]; lang?: string; page?: string }>();
    const lang = body.lang === "hi" ? "hi" : "en";
    // Where the visitor is standing changes what a good guide says next.
    const page = String(body.page || "").slice(0, 40);
    const messages = Array.isArray(body.messages) ? body.messages : [];

    const context =
      page === "build"
        ? `\nThe visitor is on the custom-build page, reading about owning their software outright. They are likely a more serious buyer — lean toward the quote/architecture-call close rather than the free demo.`
        : page === "partner"
          ? `\nThe visitor is on the partner page and is interested in EARNING by referring GoLuQ, not buying. Guide them to register as a partner.`
          : page === "services"
            ? `\nThe visitor is on the communication services page, looking at toll-free numbers, WhatsApp API, voice and SMS. They have a concrete, budgeted need — find out what they want the number to DO, and close on a quote.`
            : `\nThe visitor is on the homepage, where a free live Digital Employee demo is available. The demo is usually the easiest first close.`;

    const reply = await conciergeReply(env, { messages, lang, context });
    return Response.json({ ok: true, reply });
  } catch {
    return Response.json({ ok: true, reply: conciergeFallback("en") });
  }
};
