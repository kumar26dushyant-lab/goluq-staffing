/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
}

/** Keep the analytics table cheap and non-identifying. */
function clip(v: unknown, n: number): string | null {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, n) : null;
}

/** Host only — we never store a full referrer URL (it can carry query PII). */
function refHost(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  try {
    return new URL(s).hostname.slice(0, 120);
  } catch {
    return null;
  }
}

/**
 * First-party pageview beacon. No cookie, no IP, no cross-site identifier — see
 * the `visits` table comment in schema.sql. Always answers 204 so a tracking
 * failure can never surface as an error to a visitor.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const b = await request.json<Record<string, unknown>>();
    const sessionId = clip(b.sessionId, 40);
    const path = clip(b.path, 200);
    if (!sessionId || !path) return new Response(null, { status: 204 });

    const device = ["mobile", "tablet", "desktop"].includes(String(b.device))
      ? String(b.device)
      : null;
    const country =
      request.headers.get("cf-ipcountry") || request.headers.get("x-country") || null;

    await env.DB.prepare(
      `INSERT INTO visits (session_id, path, referrer_host, utm_source, utm_medium,
                           utm_campaign, ref_code, device, country, lang, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'))`
    )
      .bind(
        sessionId,
        path,
        refHost(b.referrer),
        clip(b.utmSource, 80),
        clip(b.utmMedium, 80),
        clip(b.utmCampaign, 80),
        clip(b.ref, 40),
        device,
        country ? country.slice(0, 4) : null,
        clip(b.lang, 8)
      )
      .run();

    return new Response(null, { status: 204 });
  } catch {
    // Analytics must never break the page.
    return new Response(null, { status: 204 });
  }
};
