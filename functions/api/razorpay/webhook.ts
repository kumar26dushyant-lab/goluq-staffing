/// <reference types="@cloudflare/workers-types" />

import { rzpConfig, rzpVerify } from "../../lib/razorpay";
import { markPaid, type PayEnv } from "../../lib/payments";

/**
 * Razorpay → us. Set in the Razorpay dashboard as
 *   https://goluq.com/api/razorpay/webhook   events: payment_link.paid,
 *   payment_link.expired, payment_link.cancelled
 * with the same secret the cockpit holds as "Webhook secret". Unsigned or
 * mis-signed calls are refused; everything else returns 200 so Razorpay does
 * not retry forever.
 */
export const onRequestPost: PagesFunction<PayEnv> = async ({ request, env }) => {
  const raw = await request.text();
  const cfg = await rzpConfig(env.DB);
  if (!cfg.webhookSecret) return Response.json({ ok: false, error: "webhook secret not set" }, { status: 503 });
  if (!(await rzpVerify(cfg.webhookSecret, raw, request.headers.get("x-razorpay-signature")))) {
    return Response.json({ ok: false, error: "bad signature" }, { status: 403 });
  }
  let body: any = {};
  try { body = JSON.parse(raw); } catch { return Response.json({ ok: true }); }

  const event = String(body?.event || "");
  const link = body?.payload?.payment_link?.entity;
  const payment = body?.payload?.payment?.entity;
  const linkId = String(link?.id || "");
  if (!linkId) return Response.json({ ok: true, ignored: event });

  try {
    if (event === "payment_link.paid") {
      await markPaid(env, linkId, String(payment?.id || ""), Number(payment?.amount || link?.amount_paid || 0));
    } else if (event === "payment_link.expired" || event === "payment_link.cancelled") {
      await env.DB.prepare("UPDATE payments SET status = ? WHERE rp_link_id = ? AND status = 'issued'")
        .bind(event.endsWith("expired") ? "expired" : "cancelled", linkId).run();
    }
  } catch (e) {
    console.log("razorpay webhook failed:", String(e).slice(0, 300));
  }
  return Response.json({ ok: true });
};
