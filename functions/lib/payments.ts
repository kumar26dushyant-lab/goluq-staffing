/// <reference types="@cloudflare/workers-types" />

import { createPaymentLink, rzpConfig, rzpReady } from "./razorpay";
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
  const rzp = await rzpConfig(db);
  if (!rzpReady(rzp)) return { ok: false, error: "Razorpay keys are not set." };
  if (!(a.amountInr > 0)) return { ok: false, error: "Amount must be above zero." };
  if (!a.phone && !a.email) return { ok: false, error: "Need a phone or an email to send it to." };

  const ref = `${a.kind}-${a.bookingId || Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const expiresAt = a.expiresAt || new Date(Date.now() + 7 * 86400e3).toISOString().slice(0, 19).replace("T", " ");
  const expireBy = Math.max(Math.floor(Date.parse(expiresAt.replace(" ", "T") + "Z") / 1000), Math.floor(Date.now() / 1000) + 20 * 60);

  const link = await createPaymentLink(rzp, {
    amountInr: a.amountInr,
    description: a.description,
    referenceId: ref,
    customer: { name: a.name || undefined, contact: a.phone || undefined, email: a.email || undefined },
    expireBy,
    notes: { kind: a.kind, booking_id: String(a.bookingId || ""), phone: a.phone || "" },
  });
  if (!link.ok) return { ok: false, error: link.error };

  const ins = await db.prepare(
    `INSERT INTO payments (kind, booking_id, phone, email, name, amount_inr, description, rp_link_id, url, status, expires_at, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,'issued',?,datetime('now'))`
  ).bind(a.kind, a.bookingId || null, a.phone || null, a.email || null, a.name || null, Math.round(a.amountInr), a.description, link.id, link.url, expiresAt).run();
  const id = Number((ins as any)?.meta?.last_row_id || 0);

  const hi = a.lang === "hi";
  const amount = fmtInr(a.amountInr);
  const intro = a.intro || (hi
    ? `${a.description} के लिए ${amount} का पेमेंट लिंक यह रहा।`
    : `Here is the ${amount} payment link for ${a.description}.`);
  const tail = hi
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
export async function markPaid(env: PayEnv, rpLinkId: string, paymentId: string, amountPaise: number): Promise<boolean> {
  const db = env.DB;
  const row = await db.prepare("SELECT id, kind, booking_id, phone, email, name, amount_inr, description, status FROM payments WHERE rp_link_id = ?")
    .bind(rpLinkId).first<{ id: number; kind: string; booking_id: number | null; phone: string | null; email: string | null; name: string | null; amount_inr: number; description: string; status: string }>();
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
      await waSendText(cfg, row.phone, hi
        ? `भुगतान मिल गया — धन्यवाद! ${row.description} के लिए ${fmtInr(row.amount_inr)}। दुष्यंत जल्द ही यहीं आपसे बात करेंगे।`
        : `Payment received — thank you! ${fmtInr(row.amount_inr)} for ${row.description}. Dushyant will take it from here and message you on this number.`).catch(() => {});
    }
  }
  await tgAlertOwner(db, env, [
    `✅ <b>Payment received</b> · ${tgEscape(row.name || row.phone || row.email || "")}`,
    `${tgEscape(fmtInr(amountPaise / 100))} · ${tgEscape(row.description)}`,
    `Razorpay ${tgEscape(paymentId)}`,
  ].join("\n"), { buttons: [[...(row.phone ? [{ text: "Open WhatsApp", url: `https://wa.me/${row.phone.replace(/\D/g, "")}` }] : [])]] }).catch(() => {});
  return true;
}
