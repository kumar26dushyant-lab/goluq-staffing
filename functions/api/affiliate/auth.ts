/// <reference types="@cloudflare/workers-types" />

import { hashPassword, randomToken, verifyPassword } from "../../lib/auth";
import { mailEnabled, sendMail, type MailEnv } from "../../lib/mailer";

interface Env extends MailEnv {
  DB: D1Database;
}

const MIN_PASSWORD = 8;
const SESSION_DAYS = 60;

const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");

/** Same opaque-token model as admin sessions, in its own table. */
async function createAffiliateSession(db: D1Database, affiliateId: number): Promise<string> {
  const token = randomToken(32);
  await db
    .prepare(
      `INSERT INTO affiliate_sessions (token, affiliate_id, created_at, expires_at)
       VALUES (?,?,datetime('now'), datetime('now', ?))`
    )
    .bind(token, affiliateId, `+${SESSION_DAYS} days`)
    .run();
  return token;
}

export async function affiliateFromSession(
  db: D1Database,
  token: string
): Promise<{ id: number; code: string; name: string; email: string | null } | null> {
  if (!token || token.length < 32) return null;
  return db
    .prepare(
      `SELECT a.id, a.code, a.name, a.email
         FROM affiliate_sessions s JOIN affiliates a ON a.id = s.affiliate_id
        WHERE s.token = ? AND s.expires_at > datetime('now') AND a.status = 'active'`
    )
    .bind(token)
    .first<{ id: number; code: string; name: string; email: string | null }>();
}

/**
 * Affiliate account actions.
 *
 * Replaces the old secret-dashboard-URL model, which was unrecoverable the
 * moment the WhatsApp message was lost. Reuses the same PBKDF2 hashing and
 * opaque-session approach as the owner login.
 *
 *   set-password  — first-time password from a registration/reset token
 *   login         — phone + password
 *   forgot        — emails a reset link (email is mandatory at registration)
 *   logout
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const b = await request.json<Record<string, unknown>>();
    const action = String(b.action ?? "");

    // ── Set or reset a password from a one-time token ──────────────────
    if (action === "set-password") {
      const token = String(b.token ?? "");
      const password = String(b.password ?? "");
      if (password.length < MIN_PASSWORD) {
        return Response.json(
          { ok: false, error: `Password must be at least ${MIN_PASSWORD} characters.` },
          { status: 400 }
        );
      }
      const aff = await env.DB.prepare(
        `SELECT id FROM affiliates
          WHERE reset_token = ? AND reset_expires > datetime('now') AND status = 'active'`
      )
        .bind(token)
        .first<{ id: number }>();
      if (!aff) {
        return Response.json(
          { ok: false, error: "This link has expired or has already been used." },
          { status: 400 }
        );
      }
      await env.DB.prepare(
        `UPDATE affiliates SET pass_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?`
      )
        .bind(await hashPassword(password), aff.id)
        .run();
      // A password change signs out every other device.
      await env.DB.prepare(`DELETE FROM affiliate_sessions WHERE affiliate_id = ?`)
        .bind(aff.id)
        .run();
      return Response.json({ ok: true, token: await createAffiliateSession(env.DB, aff.id) });
    }

    // ── Sign in ────────────────────────────────────────────────────────
    if (action === "login") {
      const phone = digits(b.phone);
      const password = String(b.password ?? "");
      const aff = await env.DB.prepare(
        `SELECT id, pass_hash FROM affiliates WHERE phone = ? AND status = 'active' LIMIT 1`
      )
        .bind(phone)
        .first<{ id: number; pass_hash: string | null }>();

      if (!aff?.pass_hash || !(await verifyPassword(password, aff.pass_hash))) {
        // One message for both failures — neither half can be probed.
        return Response.json(
          { ok: false, error: "Incorrect mobile number or password." },
          { status: 401 }
        );
      }
      return Response.json({ ok: true, token: await createAffiliateSession(env.DB, aff.id) });
    }

    // ── Forgot password → emailed reset link ───────────────────────────
    if (action === "forgot") {
      // The "email isn't configured" answer is checked BEFORE any lookup, so it
      // is identical for every number. Checking it after would turn this into an
      // oracle: a registered number would get one message and an unknown number
      // another, revealing who has an account.
      if (!mailEnabled(env)) {
        return Response.json(
          {
            ok: false,
            error:
              "Password reset by email is not switched on yet. Please contact GoLuQ on WhatsApp and we'll reset it for you.",
          },
          { status: 503 }
        );
      }

      const phone = digits(b.phone);
      const aff = await env.DB.prepare(
        `SELECT id, email, name FROM affiliates WHERE phone = ? AND status = 'active' LIMIT 1`
      )
        .bind(phone)
        .first<{ id: number; email: string | null; name: string }>();

      // From here on the answer is identical whether or not the number exists.
      const generic = {
        ok: true,
        message: "If that number is registered, a reset link has been sent to the email on file.",
      };
      if (!aff?.email) return Response.json(generic);

      const token = randomToken(24);
      await env.DB.prepare(
        `UPDATE affiliates SET reset_token = ?, reset_expires = datetime('now','+1 day') WHERE id = ?`
      )
        .bind(token, aff.id)
        .run();

      const origin = new URL(request.url).origin.replace(/^http:/, "https:");
      await sendMail(env, {
        to: aff.email,
        subject: "Reset your GoLuQ partner password",
        text:
          `Hello ${aff.name},\n\n` +
          `Use this link to choose a new password for your GoLuQ partner account:\n` +
          `${origin}/partner/reset?token=${token}\n\n` +
          `The link works once and expires in 24 hours.\n` +
          `If you didn't ask for this, you can ignore this email — nothing has changed.\n\n` +
          `— GoLuQ`,
      });
      return Response.json(generic);
    }

    if (action === "logout") {
      const token = request.headers.get("x-affiliate-token") || "";
      if (token) {
        await env.DB.prepare(`DELETE FROM affiliate_sessions WHERE token = ?`).bind(token).run();
      }
      return Response.json({ ok: true });
    }

    return Response.json({ ok: false, error: "unknown action" }, { status: 400 });
  } catch {
    return Response.json({ ok: false, error: "server" }, { status: 500 });
  }
};
