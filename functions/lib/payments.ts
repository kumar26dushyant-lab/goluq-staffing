/// <reference types="@cloudflare/workers-types" />

import { createPaymentLink, rzpConfig, rzpReady } from "./razorpay";
import { createDodoPayment, dodoConfig, dodoReady } from "./dodo";
import { convert, formatMoney, resolveMarket } from "./markets";
import { sendMail, mailEnabled, type MailEnv } from "./mailer";
import { getSetting } from "./settings";
import { tgAlertOwner, tgEscape, type TgEnv } from "./telegram";
import { waConfig, waReady, waSendCtaUrl, waSendTemplate, waSendText, type WaEnv } from "./whatsapp";

export interface PayEnv extends MailEnv, TgEnv, WaEnv {
  DB: D1Database;
}

export interface IssueArgs {
  kind: "call" | "cart";
  bookingId?: number | null;
  phone?: string | null;
  email?: string | null;
  name?: string | null;
  amountInr: number;
  /** What they are paying for, in plain words — goes on the link and in the messages. */
  description: string;
  /** SQLite UTC text; the link stops working after this. Omit for a 7-day link. */
  expiresAt?: string | null;
  lang?: string | null;
  /** The sentence before the link, per channel. Defaults are written below. */
  intro?: string;
  /** Who asked: 'cart' | 'booking' | 'cron' | 'admin' — for the owner alert. */
  by?: string;
  /** Two-letter country of the customer, from the phone's dialling code or the edge. Decides Razorpay (India) or Dodo (elsewhere). */
  country?: string;
}

export type IssueResult =
  | { ok: true; id: number; url: string; whatsapp: boolean; email: boolean }
  | { ok: false; error: string };

const fmtInr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const IST = (s: string) =>
  new Date(s.replace(" ", "T") + "Z").toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/**
 * The one way a payment link leaves this system: create it at Razorpay, record
 * it, then put it in front of the customer on WhatsApp and email and tell the
 * owner. Every caller — the cart, a fresh booking, the after-call cron, the
 * cockpit button — goes through here, so what the customer sees is consistent.
 */
export async function issuePaymentLink(env: PayEnv, a: IssueArgs): Promise<IssueResult> {
  const db = env.DB;
  if (!(a.amountInr > 0)) return { ok: false, error: "Amount must be above zero." };
  if (!a.phone && !a.email) return { ok: false, error: "Need a phone or an email to send it to." };

  const ref = `${a.kind}-${a.bookingId || Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const expiresAt = a.expiresAt || new Date(Date.now() + 7 * 86400e3).toISOString().slice(0, 19).replace("T", " ");
  const expireBy = Math.max(Math.floor(Date.parse(expiresAt.replace(" ", "T") + "Z") / 1000), Math.floor(Date.now() / 1000) + 20 * 60);

  // India pays Razorpay in rupees. Everyone else pays Dodo in dollars — the
  // same conversion the site shows them — unless Dodo is not set up yet, in
  // which case the rupee link is still better than no link.
  const country = (a.country || "").toUpperCase();
  const { market, multiplier } = await resolveMarket(db, country);
  const dodo = await dodoConfig(db);
  const abroad = country !== "" && country !== "IN" && market.currency !== "INR";
  let provider: "razorpay" | "dodo" = "razorpay";
  let currency = "INR";
  let charged = Math.round(a.amountInr);
  let link: { ok: true; id: string; url: string } | { ok: false; error: string };
  if (abroad && dodoReady(dodo)) {
    provider = "dodo";
    currency = "USD";
    const { market: usd, multiplier: m2 } = await resolveMarket(db, "US");
    charged = convert(a.amountInr, usd, m2);
    // Dodo needs an email for the receipt. A WhatsApp-only customer gets a
    // goluq.com alias so the receipt lands with us and can be forwarded.
    const email = a.email || `pay-${(a.phone || "").replace(/\D/g, "")}@goluq.com`;
    link = await createDodoPayment(db, dodo, {
      amountUsd: charged,
      description: a.description,
      customer: { email, name: a.name || undefined, phone: a.phone || undefined },
      country,
      metadata: { kind: a.kind, booking_id: String(a.bookingId || ""), phone: a.phone || "", ref },
    });
  } else {
    const rzp = await rzpConfig(db);
    if (!rzpReady(rzp)) return { ok: false, error: "Razorpay keys are not set." };
    link = await createPaymentLink(rzp, {
      amountInr: a.amountInr,
      description: a.description,
      referenceId: ref,
      customer: { name: a.name || undefined, contact: a.phone || undefined, email: a.email || undefined },
      expireBy,
      notes: { kind: a.kind, booking_id: String(a.bookingId || ""), phone: a.phone || "" },
    });
  }
  if (!link.ok) return { ok: false, error: link.error };
  void multiplier;

  const ins = await db.prepare(
    `INSERT INTO payments (kind, booking_id, phone, email, name, amount_inr, description, rp_link_id, url, status, expires_at, created_at, provider, currency, amount)
     VALUES (?,?,?,?,?,?,?,?,?,'issued',?,datetime('now'),?,?,?)`
  ).bind(a.kind, a.bookingId || null, a.phone || null, a.email || null, a.name || null, Math.round(a.amountInr), a.description, link.id, link.url, expiresAt, provider, currency, charged).run();
  const id = Number((ins as any)?.meta?.last_row_id || 0);

  const hi = a.lang === "hi";
  const amount = currency === "INR" ? fmtInr(a.amountInr) : formatMoney(charged, { ...market, currency: "USD", locale: "en-US" });
  const intro = a.intro || (hi
    ? `${a.description} के लिए ${amount} का पेमेंट लिंक यह रहा।`
    : `Here is the ${amount} payment link for ${a.description}.`);
  const tail = provider === "dodo"
    ? (hi ? "कार्ड या PayPal — अपनी करेंसी में। कोई सवाल हो तो यहीं लिख दीजिए।" : "Card or PayPal, in your own currency. Any question, just reply here.")
    : hi
      ? "UPI, कार्ड या नेटबैंकिंग — जो सुविधाजनक हो। कोई सवाल हो तो यहीं लिख दीजिए।"
      : "UPI, card or netbanking, whichever suits you. Any question, just reply here.";

  // WhatsApp: a tappable button inside the 24-hour window; the approved
  // template (once there is one) outside it; plain text as the last resort.
  let wa = false;
  if (a.phone) {
    const cfg = await waConfig(db, env);
    if (waReady(cfg)) {
      const r = await waSendCtaUrl(cfg, a.phone, `${intro}\n\n${tail}`, hi ? "अभी भुगतान करें" : "Pay now", link.url);
      if (r.ok) wa = true;
      else {
        const tpl = (await getSetting(db, "wa_tpl_payment_link")) || "";
        if (tpl) {
          const t = await waSendTemplate(cfg, a.phone, tpl, hi ? "hi" : "en", [a.name || (hi ? "जी" : "there"), a.description, link.url]);
          wa = t.ok;
        }
        if (!wa) {
          const t = await waSendText(cfg, a.phone, `${intro}\n${link.url}\n\n${tail}`);
          wa = t.ok;
        }
      }
      if (wa) {
        await db.prepare(`INSERT INTO chat_messages (session_id, role, content, created_at) VALUES (?, 'guide', ?, datetime('now'))`)
          .bind(`wa:${a.phone}`, `[Sent payment link ${amount} · ${a.description}]`).run().catch(() => {});
      }
    }
  }

  let mail = false;
  if (a.email && mailEnabled(env)) {
    const r = await sendMail(env, {
      to: a.email,
      subject: hi ? `GoLuQ — ${a.description} के लिए ${amount} का पेमेंट लिंक` : `GoLuQ — payment link for ${a.description} (${amount})`,
      text: [
        a.name ? (hi ? `नमस्ते ${a.name},` : `Hi ${a.name},`) : hi ? "नमस्ते," : "Hi,",
        "",
        intro,
        "",
        link.url,
        "",
        tail,
        "",
        hi ? "— दुष्यंत शर्मा, GoLuQ.com Digital Consultancy" : "— Dushyant Sharma, GoLuQ.com Digital Consultancy",
      ].join("\n"),
    });
    mail = r.ok;
  }

  await tgAlertOwner(db, env, [
    `💳 <b>Payment link sent</b> · ${tgEscape(a.name || a.phone || a.email || "")}`,
    `${tgEscape(amount)} · ${tgEscape(a.description)}`,
    `via ${wa ? "WhatsApp" : ""}${wa && mail ? " + " : ""}${mail ? "email" : ""}${!wa && !mail ? "nothing delivered — check WhatsApp/email setup" : ""}${a.by ? ` · ${tgEscape(a.by)}` : ""}`,
    `valid till ${tgEscape(IST(expiresAt))} IST`,
  ].join("\n"), { buttons: [[{ text: "Open link", url: link.url }]] }).catch(() => {});

  return { ok: true, id, url: link.url, whatsapp: wa, email: mail };
}

/** Live price of the founder call, from the Store — never a number in code. */
export async function callPriceInr(db: D1Database): Promise<number> {
  const p = await db.prepare("SELECT price_inr FROM products WHERE retailer_id = 'founder' AND tenant = 'goluq'").first<{ price_inr: number }>();
  return Number(p?.price_inr || 0);
}

/** Someone who put the founder call in their WhatsApp cart recently, by phone or email. */
export async function callIntentFor(db: D1Database, phone: string | null, email: string | null): Promise<{ phone: string; lang: string | null } | null> {
  const last10 = (phone || "").replace(/\D/g, "").slice(-10);
  if (last10.length === 10) {
    const s = await db.prepare(
      `SELECT visitor_phone, lang FROM chat_sessions WHERE id LIKE ? AND call_cart_at >= datetime('now','-30 days') ORDER BY call_cart_at DESC LIMIT 1`
    ).bind(`wa:%${last10}`).first<{ visitor_phone: string; lang: string | null }>();
    if (s) return { phone: s.visitor_phone, lang: s.lang };
  }
  if (email) {
    // The booking form asks for email; the WhatsApp thread rarely has it. A
    // lead row with both is the bridge when the phone was left off the form.
    const l = await db.prepare(`SELECT phone FROM leads WHERE lower(email) = ? AND phone <> '' ORDER BY id DESC LIMIT 1`).bind(email.toLowerCase()).first<{ phone: string }>();
    if (l?.phone) return callIntentFor(db, l.phone, null);
  }
  return null;
}

/** Mark the paid row and tell the owner. Called from the Razorpay webhook. */
export async function markPaid(env: PayEnv, rpLinkId: string, paymentId: string, amountMinor: number, currency = "INR"): Promise<boolean> {
  const db = env.DB;
  const row = await db.prepare("SELECT id, kind, booking_id, phone, email, name, amount_inr, description, status, currency, amount FROM payments WHERE rp_link_id = ?")
    .bind(rpLinkId).first<{ id: number; kind: string; booking_id: number | null; phone: string | null; email: string | null; name: string | null; amount_inr: number; description: string; status: string; currency: string | null; amount: number | null }>();
  if (!row) return false;
  if (row.status === "paid") return true;
  await db.prepare("UPDATE payments SET status = 'paid', paid_at = datetime('now') WHERE id = ?").bind(row.id).run();
  // Any sibling links for the same booking are now moot.
  if (row.booking_id) {
    await db.prepare("UPDATE payments SET status = 'cancelled' WHERE booking_id = ? AND id <> ? AND status = 'issued'").bind(row.booking_id, row.id).run();
  }
  if (row.phone) {
    const last10 = row.phone.replace(/\D/g, "").slice(-10);
    await db.prepare(`UPDATE leads SET status = CASE WHEN status IN ('new','engaged') THEN 'engaged' ELSE status END, next_followup_at = NULL WHERE phone LIKE ?`).bind(`%${last10}`).run().catch(() => {});
    const cfg = await waConfig(db, env);
    if (waReady(cfg)) {
      const s = await db.prepare("SELECT lang FROM chat_sessions WHERE id = ?").bind(`wa:${row.phone}`).first<{ lang: string | null }>();
      const hi = s?.lang === "hi";
      const shown = row.currency && row.currency !== "INR" ? `${row.currency} ${Number(row.amount || 0).toLocaleString("en-US")}` : fmtInr(row.amount_inr);
      await waSendText(cfg, row.phone, hi
        ? `भुगतान मिल गया — धन्यवाद! ${row.description} के लिए ${shown}। दुष्यंत जल्द ही यहीं आपसे बात करेंगे।`
        : `Payment received — thank you! ${shown} for ${row.description}. Dushyant will take it from here and message you on this number.`).catch(() => {});
    }
  }
  await tgAlertOwner(db, env, [
    `✅ <b>Payment received</b> · ${tgEscape(row.name || row.phone || row.email || "")}`,
    `${tgEscape(currency === "INR" ? fmtInr(amountMinor / 100) : `${currency} ${(amountMinor / 100).toLocaleString("en-US")}`)} · ${tgEscape(row.description)}`,
    `${currency === "INR" ? "Razorpay" : "Dodo"} ${tgEscape(paymentId)}`,
  ].join("\n"), { buttons: [[...(row.phone ? [{ text: "Open WhatsApp", url: `https://wa.me/${row.phone.replace(/\D/g, "")}` }] : [])]] }).catch(() => {});
  return true;
}

/**
 * Country from a phone's dialling code — the only clue a WhatsApp number
 * gives. Only codes we price for; anything else is "" and the caller treats
 * it as unknown (which means India, the base market).
 */
export function countryFromPhone(phone: string): string {
  const p = String(phone || "").replace(/\D/g, "");
  const CODES: [string, string][] = [
    ["91", "IN"], ["971", "AE"], ["966", "SA"], ["974", "QA"], ["965", "KW"],
    ["968", "OM"], ["973", "BH"], ["44", "GB"], ["61", "AU"], ["65", "SG"],
    ["880", "BD"], ["92", "PK"], ["94", "LK"], ["977", "NP"], ["49", "DE"], ["33", "FR"], ["39", "IT"], ["34", "ES"], ["31", "NL"],
  ];
  for (const [code, cc] of CODES.sort((x, y) => y[0].length - x[0].length)) if (p.startsWith(code)) return cc;
  if (p.startsWith("1")) return "US";
  return "";
}
