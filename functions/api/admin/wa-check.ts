/// <reference types="@cloudflare/workers-types" />

import { checkAdmin, unauthorized } from "../../lib/admin";
import { waConfig, waReady, waSendText, waNormalize, type WaEnv } from "../../lib/whatsapp";

interface Env extends WaEnv {
  DB: D1Database;
  ADMIN_SECRET: string;
}

const GRAPH = "https://graph.facebook.com/v21.0";

/**
 * "Is my WhatsApp actually connected?" — answered without guesswork.
 *
 * Asks Meta who this phone number ID belongs to, using the stored token. That
 * single call proves the phone number ID and the access token are both real and
 * paired, which is the half of the setup a person cannot check by looking at the
 * site. The other half (the webhook) can only be proven by a real message, so
 * the reply says so plainly rather than implying a green tick means everything.
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await checkAdmin(request, env))) return unauthorized();
  const cfg = await waConfig(env.DB, env);

  const checklist = {
    phoneNumberId: Boolean(cfg.phoneNumberId),
    accessToken: Boolean(cfg.accessToken),
    verifyToken: Boolean(cfg.verifyToken),
    appSecret: Boolean(cfg.appSecret),
  };

  if (!waReady(cfg)) {
    return Response.json({
      ok: false,
      checklist,
      error: "Phone number ID and access token are both needed before anything can be checked.",
    });
  }

  try {
    const res = await fetch(
      `${GRAPH}/${cfg.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`,
      { headers: { Authorization: `Bearer ${cfg.accessToken}` } }
    );
    const text = await res.text();
    let j: any = {};
    try {
      j = JSON.parse(text);
    } catch {
      /* fall through to the raw text below */
    }
    if (!res.ok) {
      // Meta's own message is far more useful than anything invented here —
      // it names the expired token or the wrong id directly.
      return Response.json({
        ok: false,
        checklist,
        error: j?.error?.message || `Meta refused the request (HTTP ${res.status}).`,
      });
    }
    return Response.json({
      ok: true,
      checklist,
      number: j?.display_phone_number || "",
      name: j?.verified_name || "",
      quality: j?.quality_rating || "",
    });
  } catch (e) {
    return Response.json({ ok: false, checklist, error: String(e).slice(0, 200) });
  }
};

/**
 * Send a real message to a number you choose, to prove sending works.
 *
 * This will fail unless that number messaged the business number within the last
 * 24 hours — Meta only allows free-form text inside that window. That is not a
 * fault to work around; it is the rule, and the error text says so.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await checkAdmin(request, env))) return unauthorized();
  const cfg = await waConfig(env.DB, env);
  if (!waReady(cfg)) {
    return Response.json({ ok: false, error: "WhatsApp is not configured yet." });
  }
  try {
    const b = await request.json<{ to?: string }>();
    const to = waNormalize(String(b.to || ""));
    if (to.length < 10) return Response.json({ ok: false, error: "Enter a valid number." });

    const sent = await waSendText(
      cfg,
      to,
      "This is a test from your GoLuQ cockpit. If you are reading it on WhatsApp, sending works."
    );
    if (sent.ok) return Response.json({ ok: true, id: sent.id });

    const outsideWindow = /re-?engagement|24|template/i.test(sent.error);
    return Response.json({
      ok: false,
      error: outsideWindow
        ? "Meta refused this because that number has not messaged your business number in the last 24 hours. Send it a WhatsApp message from that phone first, then try again."
        : sent.error,
    });
  } catch {
    return Response.json({ ok: false, error: "server" }, { status: 500 });
  }
};
