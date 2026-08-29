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

  // Has Meta EVER delivered an inbound message? This is the half that a Graph
  // call cannot answer, and the half that is usually broken: the callback URL
  // verifies happily while messages are never forwarded. "Never" here, after a
  // real test message, means the problem is on Meta's side of the wire, not ours.
  const inbound = await inboundHealth(env.DB);

  try {
    const res = await fetch(
      `${GRAPH}/${cfg.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,name_status,code_verification_status,platform_type`,
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
        inbound,
        error: j?.error?.message || `Meta refused the request (HTTP ${res.status}).`,
      });
    }
    return Response.json({
      ok: true,
      checklist,
      inbound,
      number: j?.display_phone_number || "",
      name: j?.verified_name || "",
      quality: j?.quality_rating || "",
      // DECLINED here is why customers may see a bare number instead of the
      // business name. It does not stop messages; it only weakens them.
      nameStatus: j?.name_status || "",
      verification: j?.code_verification_status || "",
      platform: j?.platform_type || "",
    });
  } catch (e) {
    return Response.json({ ok: false, checklist, inbound, error: String(e).slice(0, 200) });
  }
};

/** How many inbound WhatsApp messages have reached the webhook, and when last. */
async function inboundHealth(
  db: D1Database
): Promise<{ count: number; lastAt: string | null; threads: number }> {
  try {
    const ev = await db
      .prepare("SELECT COUNT(*) AS c, MAX(created_at) AS m FROM wa_events")
      .first<{ c: number; m: string | null }>();
    const th = await db
      .prepare("SELECT COUNT(*) AS c FROM chat_sessions WHERE page = 'whatsapp'")
      .first<{ c: number }>();
    return { count: Number(ev?.c || 0), lastAt: ev?.m || null, threads: Number(th?.c || 0) };
  } catch {
    return { count: 0, lastAt: null, threads: 0 };
  }
}

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
