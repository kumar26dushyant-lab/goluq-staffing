/// <reference types="@cloudflare/workers-types" />

import { getSetting } from "../../lib/settings";
import { createCustomerSession } from "../../lib/portal";
import { randomToken } from "../../lib/auth";
import { upsertCustomer } from "./otp";

interface Env {
  DB: D1Database;
}

const CALLBACK = "https://goluq.com/api/auth/google/callback";

/**
 * "Continue with Google", the plain OAuth code flow — no SDK in the browser,
 * the client secret only ever on the server.
 *
 *   GET /api/auth/google?next=/start           → redirect to Google
 *   GET /api/auth/google/callback?code&state   → session, redirect to next#token=…
 *
 * `state` is a one-time row in login_codes (channel 'google'), so a forged
 * callback cannot log anyone in. The token rides in the URL fragment, which
 * browsers never send to servers or logs.
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const u = new URL(request.url);
  const clientId = (await getSetting(env.DB, "google_client_id")) || "";
  const clientSecret = (await getSetting(env.DB, "google_client_secret")) || "";
  if (!clientId || !clientSecret) return Response.json({ ok: false, error: "google_unavailable" }, { status: 503 });

  if (!u.pathname.endsWith("/callback")) {
    const next = safeNext(u.searchParams.get("next"));
    const lang = (u.searchParams.get("lang") || "en").startsWith("hi") ? "hi" : "en";
    const state = randomToken(24);
    await env.DB.prepare(
      `INSERT INTO login_codes (channel, target, code_hash, name, attempts, created_at, expires_at)
       VALUES ('google', ?, '', ?, 0, datetime('now'), datetime('now','+10 minutes'))`
    ).bind(state, `${lang} ${next}`).run();
    const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    auth.searchParams.set("client_id", clientId);
    auth.searchParams.set("redirect_uri", CALLBACK);
    auth.searchParams.set("response_type", "code");
    auth.searchParams.set("scope", "openid email profile");
    auth.searchParams.set("state", state);
    auth.searchParams.set("prompt", "select_account");
    return Response.redirect(auth.toString(), 302);
  }

  const state = u.searchParams.get("state") || "";
  const code = u.searchParams.get("code") || "";
  const row = await env.DB.prepare(
    `SELECT id, name FROM login_codes WHERE channel = 'google' AND target = ? AND used_at IS NULL AND expires_at > datetime('now')`
  ).bind(state).first<{ id: number; name: string }>();
  if (!row || !code) return Response.redirect("https://goluq.com/start?error=google", 302);
  await env.DB.prepare("UPDATE login_codes SET used_at = datetime('now') WHERE id = ?").bind(row.id).run();
  const [lang, next] = row.name.split(" ", 2);

  try {
    const tok = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: CALLBACK, grant_type: "authorization_code" }),
    });
    const tj: any = await tok.json();
    if (!tok.ok || !tj.access_token) throw new Error(tj?.error_description || "token");
    const ui = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${tj.access_token}` } });
    const user: any = await ui.json();
    const email = String(user?.email || "").toLowerCase();
    const sub = String(user?.sub || "");
    if (!email || !sub || user?.email_verified === false) throw new Error("no verified email");
    const me = await upsertCustomer(env.DB, "google", email, String(user?.name || "").slice(0, 120), lang || "en", sub);
    const token = await createCustomerSession(env.DB, me.id);
    return Response.redirect(`https://goluq.com${safeNext(next)}#token=${token}`, 302);
  } catch (e) {
    console.log("google sign-in failed:", String(e).slice(0, 200));
    return Response.redirect("https://goluq.com/start?error=google", 302);
  }
};

/** Only same-site paths; never an open redirect. */
function safeNext(v: string | null): string {
  const s = String(v || "/start");
  return /^\/[A-Za-z0-9_\-/?=&.#]*$/.test(s) ? s : "/start";
}
