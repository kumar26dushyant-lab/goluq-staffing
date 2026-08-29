/// <reference types="@cloudflare/workers-types" />

import { hashPassword, verifyPassword, randomToken } from "../../lib/auth";
import { mailEnabled, sendMail, type MailEnv } from "../../lib/mailer";
import { createCustomerSession, customerFromRequest, notLoggedIn } from "../../lib/portal";

interface Env extends MailEnv {
  DB: D1Database;
}

const MIN_PASSWORD = 8;
const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");

/** GET → who am I (used by the portal to decide whether to show the login). */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const me = await customerFromRequest(env.DB, request);
  if (!me) return notLoggedIn();
  return Response.json({ ok: true, customer: me });
};

/**
 * POST { action }
 *   "login"   { phone, password }        → session token
 *   "setup"   { token, password }        → first password from the emailed link
 *   "forgot"  { phone }                  → emails a fresh set-password link
 *   "logout"  (bearer token)             → ends this session
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let b: Record<string, unknown>;
  try {
    b = await request.json<Record<string, unknown>>();
  } catch {
    return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const action = String(b.action || "login");

  if (action === "logout") {
    const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (token) await env.DB.prepare("DELETE FROM customer_sessions WHERE token = ?").bind(token).run();
    return Response.json({ ok: true });
  }

  if (action === "login") {
    const phone = digits(b.phone);
    const password = String(b.password || "");
    if (!phone || !password) return Response.json({ ok: false, error: "missing" }, { status: 400 });

    const row = await env.DB.prepare(
      "SELECT id, pass_hash FROM customers WHERE phone = ? AND status = 'active'"
    )
      .bind(phone)
      .first<{ id: number; pass_hash: string | null }>();

    // One message for "no such account" and "wrong password" alike. Telling the
    // two apart turns this form into a way to discover who our customers are.
    const bad = () => Response.json({ ok: false, error: "invalid" }, { status: 401 });
    if (!row || !row.pass_hash) return bad();
    if (!(await verifyPassword(password, row.pass_hash))) return bad();

    const token = await createCustomerSession(env.DB, row.id);
    return Response.json({ ok: true, token });
  }

  if (action === "setup") {
    const token = String(b.token || "").trim();
    const password = String(b.password || "");
    if (password.length < MIN_PASSWORD) {
      return Response.json(
        { ok: false, error: `Password must be at least ${MIN_PASSWORD} characters.` },
        { status: 400 }
      );
    }
    const row = await env.DB.prepare(
      `SELECT id FROM customers
        WHERE setup_token = ? AND setup_token IS NOT NULL
          AND setup_expires > datetime('now') AND status = 'active'`
    )
      .bind(token)
      .first<{ id: number }>();
    if (!row) return Response.json({ ok: false, error: "link_expired" }, { status: 400 });

    // The link is spent the moment it is used — a set-password link left alive
    // in an inbox is a permanent way in.
    await env.DB.prepare(
      "UPDATE customers SET pass_hash = ?, setup_token = NULL, setup_expires = NULL WHERE id = ?"
    )
      .bind(await hashPassword(password), row.id)
      .run();
    const session = await createCustomerSession(env.DB, row.id);
    return Response.json({ ok: true, token: session });
  }

  if (action === "forgot") {
    // Checked before any lookup: if mail is off, every reply must be the same
    // one, or the difference between them reveals which numbers are customers.
    if (!mailEnabled(env)) {
      return Response.json({ ok: true, sent: false, note: "Email is not configured yet." });
    }
    const phone = digits(b.phone);
    const row = await env.DB.prepare(
      "SELECT id, name, email FROM customers WHERE phone = ? AND status = 'active'"
    )
      .bind(phone)
      .first<{ id: number; name: string; email: string | null }>();

    if (row?.email) {
      const token = randomToken(24);
      await env.DB.prepare(
        "UPDATE customers SET setup_token = ?, setup_expires = datetime('now', '+2 days') WHERE id = ?"
      )
        .bind(token, row.id)
        .run();
      const link = `https://goluq.com/portal?setup=${token}`;
      await sendMail(env, {
        to: row.email,
        subject: "Set your GoLuQ password",
        text:
          `Hello ${row.name},\n\n` +
          `Open this link to choose a password for your GoLuQ project portal:\n${link}\n\n` +
          `The link works for two days and once only.\n\n` +
          `If you did not ask for this, ignore this email — nothing has changed.\n`,
      });
    }
    // Same answer either way.
    return Response.json({ ok: true, sent: true });
  }

  return Response.json({ ok: false, error: "unknown_action" }, { status: 400 });
};
