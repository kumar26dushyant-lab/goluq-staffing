/// <reference types="@cloudflare/workers-types" />

import { getSetting } from "../../lib/settings";
import { sendMail, mailEnabled, type MailEnv } from "../../lib/mailer";
import { waConfig, waReady, waSendAuthTemplate, type WaEnv } from "../../lib/whatsapp";
import { createCustomerSession } from "../../lib/portal";
import { sha256Hex } from "../../lib/auth";

interface Env extends MailEnv, WaEnv {
  DB: D1Database;
}

/**
 * One-time-code sign-in, the way it works everywhere in the world without an
 * SMS gateway: a six-digit code by email, or by WhatsApp once the
 * `login_otp` authentication template is approved. Creates the customer on
 * first use; the same customer row serves the portal, the intake and, later,
 * the store.
 *
 *   POST { action: "start",  channel: "email" | "whatsapp", to, name?, lang? }
 *   POST { action: "verify", channel, to, code }  → { token, customer }
 *
 * Codes live ten minutes, five attempts, five sends per address per hour.
 * The code itself is never stored, only its hash.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let b: Record<string, unknown>;
  try { b = await request.json<Record<string, unknown>>(); } catch { return bad("bad_request"); }
  const action = String(b.action || "");
  const channel = b.channel === "whatsapp" ? "whatsapp" : "email";
  const lang = String(b.lang || "en").startsWith("hi") ? "hi" : "en";
  const target = normalizeTarget(channel, String(b.to || ""));
  if (!target) return bad(channel === "email" ? "bad_email" : "bad_phone");

  if (action === "start") {
    const recent = await env.DB.prepare(
      `SELECT COUNT(*) AS c FROM login_codes WHERE target = ? AND created_at >= datetime('now','-1 hour')`
    ).bind(target).first<number>("c");
    if ((recent ?? 0) >= 5) return bad("too_many", 429);

    const code = String(Math.floor(100000 + Math.random() * 900000));
    await env.DB.prepare(
      `INSERT INTO login_codes (channel, target, code_hash, name, attempts, created_at, expires_at)
       VALUES (?,?,?,?,0,datetime('now'),datetime('now','+10 minutes'))`
    ).bind(channel, target, await sha256Hex(code + target), String(b.name || "").trim().slice(0, 120)).run();

    if (channel === "email") {
      if (!mailEnabled(env)) return bad("email_unavailable", 503);
      const r = await sendMail(env, {
        to: target,
        subject: lang === "hi" ? `${code} — GoLuQ साइन-इन कोड` : `${code} is your GoLuQ sign-in code`,
        text: lang === "hi"
          ? `आपका GoLuQ साइन-इन कोड: ${code}\n\nयह 10 मिनट तक चलेगा। अगर आपने यह नहीं माँगा था, तो इस ईमेल को अनदेखा कर दीजिए।\n\n— GoLuQ.com Digital Consultancy`
          : `Your GoLuQ sign-in code: ${code}\n\nIt works for 10 minutes. If you did not ask for it, ignore this email.\n\n— GoLuQ.com Digital Consultancy`,
      });
      if (!r.ok) return bad("send_failed", 502);
    } else {
      const tpl = (await getSetting(env.DB, "wa_tpl_login_otp")) || "";
      const cfg = await waConfig(env.DB, env);
      if (!tpl || !waReady(cfg)) return bad("whatsapp_unavailable", 503);
      const r = await waSendAuthTemplate(cfg, target, tpl, lang, code);
      if (!r.ok) return bad("send_failed", 502);
    }
    return Response.json({ ok: true, channel, to: target });
  }

  if (action === "verify") {
    const code = String(b.code || "").replace(/\D/g, "");
    if (code.length !== 6) return bad("bad_code");
    const row = await env.DB.prepare(
      `SELECT id, code_hash, name, attempts FROM login_codes
        WHERE target = ? AND channel = ? AND used_at IS NULL AND expires_at > datetime('now')
        ORDER BY id DESC LIMIT 1`
    ).bind(target, channel).first<{ id: number; code_hash: string; name: string; attempts: number }>();
    if (!row) return bad("expired", 401);
    if (row.attempts >= 5) return bad("too_many", 429);
    if (row.code_hash !== (await sha256Hex(code + target))) {
      await env.DB.prepare("UPDATE login_codes SET attempts = attempts + 1 WHERE id = ?").bind(row.id).run();
      return bad("wrong_code", 401);
    }
    await env.DB.prepare("UPDATE login_codes SET used_at = datetime('now') WHERE id = ?").bind(row.id).run();

    const customer = await upsertCustomer(env.DB, channel, target, row.name, lang);
    const token = await createCustomerSession(env.DB, customer.id);
    return Response.json({ ok: true, token, customer });
  }

  return bad("unknown_action");
};

function bad(error: string, status = 400): Response {
  return Response.json({ ok: false, error }, { status });
}

/** Email lowercased; phone digits with the country code (10 digits → India). */
export function normalizeTarget(channel: "email" | "whatsapp", raw: string): string {
  if (channel === "email") {
    const e = raw.trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 200 ? e : "";
  }
  let d = raw.replace(/\D/g, "").replace(/^0+/, "");
  if (d.length === 10) d = "91" + d;
  return d.length >= 11 && d.length <= 15 ? d : "";
}

export interface Me { id: number; name: string; phone: string; email: string | null; company: string | null }

/**
 * Find or create the customer behind a sign-in. `customers.phone` is the
 * unique key from the password era; an email sign-in that has no number yet
 * gets a sentinel ("email:<addr>") until the intake collects the WhatsApp
 * number.
 */
export async function upsertCustomer(db: D1Database, channel: "email" | "whatsapp" | "google", target: string, name: string, lang: string, googleSub?: string): Promise<Me> {
  const find = async (sql: string, v: string) =>
    db.prepare(sql).bind(v).first<Me>();
  let me: Me | null = null;
  if (channel === "whatsapp") me = await find("SELECT id, name, phone, email, company FROM customers WHERE phone = ?", target);
  else {
    if (googleSub) me = await find("SELECT id, name, phone, email, company FROM customers WHERE google_sub = ?", googleSub);
    if (!me) me = await find("SELECT id, name, phone, email, company FROM customers WHERE lower(email) = ?", target);
  }
  if (me) {
    if (googleSub) await db.prepare("UPDATE customers SET google_sub = COALESCE(google_sub, ?) WHERE id = ?").bind(googleSub, me.id).run();
    if (name && (!me.name || me.name === "Customer")) {
      await db.prepare("UPDATE customers SET name = ? WHERE id = ?").bind(name, me.id).run();
      me.name = name;
    }
    return me;
  }
  const phone = channel === "whatsapp" ? target : `email:${target}`;
  const email = channel === "whatsapp" ? null : target;
  const r = await db.prepare(
    `INSERT INTO customers (name, phone, email, status, created_at, google_sub, lang) VALUES (?,?,?,'active',datetime('now'),?,?)`
  ).bind(name || "Customer", phone, email, googleSub || null, lang).run();
  return { id: Number((r as any)?.meta?.last_row_id || 0), name: name || "Customer", phone, email, company: null };
}
