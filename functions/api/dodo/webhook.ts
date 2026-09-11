/// <reference types="@cloudflare/workers-types" />

import { dodoConfig, dodoVerify } from "../../lib/dodo";
import { markPaid, type PayEnv } from "../../lib/payments";

/**
 * Dodo Payments → us. Dashboard → Developer → Webhooks → endpoint
 *   https://goluq.com/api/dodo/webhook   events: payment.succeeded, payment.failed
 * Signed per Standard Webhooks; unsigned calls are refused. Everything else
 * returns 200 so Dodo does not retry a message we have already handled.
 */
export const onRequestPost: PagesFunction<PayEnv> = async ({ request, env }) => {
  const raw = await request.text();
  const cfg = await dodoConfig(env.DB);
  if (!cfg.webhookSecret) return Response.json({ ok: false, error: "webhook secret not set" }, { status: 503 });
  if (!(await dodoVerify(cfg.webhookSecret, request.headers, raw))) {
    return Response.json({ ok: false, error: "bad signature" }, { status: 403 });
  }
  let body: any = {};
  try { body = JSON.parse(raw); } catch { return Response.json({ ok: true }); }
  const type = String(body?.type || "");
  const d = body?.data || {};
  const paymentId = String(d?.payment_id || "");
  if (!paymentId) return Response.json({ ok: true, ignored: type });
  try {
    if (type === "payment.succeeded") {
      await markPaid(env, paymentId, paymentId, Number(d?.total_amount || 0), String(d?.currency || "USD"));
    } else if (type === "payment.failed" || type === "payment.cancelled") {
      await env.DB.prepare("UPDATE payments SET status = 'cancelled' WHERE rp_link_id = ? AND status = 'issued'").bind(paymentId).run();
    }
  } catch (e) {
    console.log("dodo webhook failed:", String(e).slice(0, 300));
  }
  return Response.json({ ok: true });
};
