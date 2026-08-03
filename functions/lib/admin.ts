/// <reference types="@cloudflare/workers-types" />

import { sessionValid } from "./auth";

/** Constant-time-ish compare so the admin secret isn't leaked via timing. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export interface AdminEnv {
  ADMIN_SECRET?: string;
  DB?: D1Database;
}

/**
 * Authorises an admin request by EITHER:
 *  - a login session token (`x-admin-token`), the normal path for the owner
 *    signing in with username + password; or
 *  - ADMIN_SECRET (`x-admin-secret` or `?secret=`), kept as a break-glass
 *    credential and for the follow-up cron. `?secret=` remains supported
 *    because the CSV export is a plain <a download> and cannot send headers.
 *
 * Async because session validation hits the database.
 */
export async function checkAdmin(request: Request, env: AdminEnv): Promise<boolean> {
  const url = new URL(request.url);

  const token = request.headers.get("x-admin-token") || url.searchParams.get("token") || "";
  if (token && env.DB && (await sessionValid(env.DB, token))) return true;

  if (!env.ADMIN_SECRET) return false;
  const sec = request.headers.get("x-admin-secret") || url.searchParams.get("secret") || "";
  return !!sec && safeEqual(sec, env.ADMIN_SECRET);
}

export function unauthorized(): Response {
  return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
}
