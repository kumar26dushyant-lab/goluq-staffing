/// <reference types="@cloudflare/workers-types" />

/** Constant-time-ish compare so the admin secret isn't leaked via timing. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** True if the request carries the correct ADMIN_SECRET (header or ?secret=). */
export function checkAdmin(request: Request, env: { ADMIN_SECRET?: string }): boolean {
  if (!env.ADMIN_SECRET) return false;
  const url = new URL(request.url);
  const sec = request.headers.get("x-admin-secret") || url.searchParams.get("secret") || "";
  return safeEqual(sec, env.ADMIN_SECRET);
}

export function unauthorized(): Response {
  return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
}
