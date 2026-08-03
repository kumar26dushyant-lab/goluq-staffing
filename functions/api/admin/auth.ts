/// <reference types="@cloudflare/workers-types" />

import { checkAdmin } from "../../lib/admin";
import {
  createSession,
  destroySession,
  getAuth,
  mintSetupToken,
  setPassword,
  setupTokenValid,
  verifyPassword,
} from "../../lib/auth";

interface Env {
  DB: D1Database;
  ADMIN_SECRET?: string;
}

const MIN_PASSWORD = 8;

/**
 * GET ?setup=<token> → is this setup link still usable?
 * Deliberately reveals nothing except validity.
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const setup = url.searchParams.get("setup");
  if (setup) {
    const valid = await setupTokenValid(env.DB, setup);
    const auth = valid ? await getAuth(env.DB) : null;
    return Response.json({ ok: true, valid, username: auth?.username ?? "" });
  }
  // Whether a password has been set — lets the sign-in screen explain itself.
  const auth = await getAuth(env.DB);
  return Response.json({ ok: true, configured: !!auth?.pass_hash });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const b = await request.json<Record<string, unknown>>();
    const action = String(b.action ?? "");

    // ── Choose a password from a one-time setup link ────────────────────
    if (action === "set-password") {
      const token = String(b.setupToken ?? "");
      const password = String(b.password ?? "");
      if (!(await setupTokenValid(env.DB, token))) {
        return Response.json(
          { ok: false, error: "This link has expired or has already been used." },
          { status: 400 }
        );
      }
      if (password.length < MIN_PASSWORD) {
        return Response.json(
          { ok: false, error: `Password must be at least ${MIN_PASSWORD} characters.` },
          { status: 400 }
        );
      }
      await setPassword(env.DB, password);
      const session = await createSession(env.DB);
      return Response.json({ ok: true, token: session });
    }

    // ── Normal sign in ──────────────────────────────────────────────────
    if (action === "login") {
      const username = String(b.username ?? "").replace(/\D/g, "");
      const password = String(b.password ?? "");
      const auth = await getAuth(env.DB);
      if (!auth?.pass_hash || !auth.username) {
        return Response.json({ ok: false, error: "No password has been set yet." }, { status: 400 });
      }
      const userOk = username === String(auth.username).replace(/\D/g, "");
      const passOk = await verifyPassword(password, auth.pass_hash);
      // One message for both failures — don't reveal which half was wrong.
      if (!userOk || !passOk) {
        return Response.json(
          { ok: false, error: "Incorrect username or password." },
          { status: 401 }
        );
      }
      const session = await createSession(env.DB);
      return Response.json({ ok: true, token: session });
    }

    if (action === "logout") {
      const token = request.headers.get("x-admin-token") || "";
      if (token) await destroySession(env.DB, token);
      return Response.json({ ok: true });
    }

    // ── Mint a fresh setup link (requires being signed in already) ───────
    if (action === "new-setup-link") {
      if (!(await checkAdmin(request, env))) {
        return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
      }
      const username = b.username ? String(b.username).replace(/\D/g, "") : undefined;
      const token = await mintSetupToken(env.DB, username);
      const origin = new URL(request.url).origin;
      return Response.json({ ok: true, url: `${origin}/admin/setup?token=${token}` });
    }

    return Response.json({ ok: false, error: "unknown action" }, { status: 400 });
  } catch {
    return Response.json({ ok: false, error: "server" }, { status: 500 });
  }
};
