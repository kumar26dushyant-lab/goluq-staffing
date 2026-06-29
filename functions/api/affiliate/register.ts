/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
}

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const UPI_RE = /^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/;
const PHONE_RE = /^[6-9]\d{9}$/;

const ALPHANUM = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars

function makeCode(name: string): string {
  const prefix = (name.replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase() || "GOLU").padEnd(4, "X");
  let suffix = "";
  const buf = new Uint8Array(3);
  crypto.getRandomValues(buf);
  for (const b of buf) suffix += ALPHANUM[b % ALPHANUM.length];
  return prefix + suffix;
}

function makeToken(): string {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Create an affiliate; return code + token + links. Idempotent on duplicate phone. */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const b = await request.json<Record<string, unknown>>();
    const name = String(b.name ?? "").trim();
    const phone = String(b.phone ?? "").trim();
    const pan = String(b.pan ?? "").trim().toUpperCase();
    const upiId = String(b.upiId ?? "").trim();
    const email = b.email ? String(b.email).trim() : null;
    const city = b.city ? String(b.city).trim() : null;
    const youtube = b.youtubeUrl ? String(b.youtubeUrl).trim() : null;

    if (name.length < 2 || !PHONE_RE.test(phone) || !PAN_RE.test(pan) || !UPI_RE.test(upiId)) {
      return Response.json({ ok: false, error: "invalid input" }, { status: 400 });
    }

    const origin = new URL(request.url).origin;
    const links = (code: string, token: string) => ({
      shareUrl: `${origin}/?ref=${code}`,
      dashboardUrl: `${origin}/partner/dashboard?token=${token}`,
    });

    // Idempotent re-register: same phone → return existing record's links.
    const existing = await env.DB.prepare(
      `SELECT code, token FROM affiliates WHERE phone = ? LIMIT 1`
    )
      .bind(phone)
      .first<{ code: string; token: string }>();
    if (existing) {
      return Response.json({ ok: true, code: existing.code, token: existing.token, ...links(existing.code, existing.token) });
    }

    // Generate a unique code (retry on collision).
    let code = "";
    for (let i = 0; i < 5; i++) {
      code = makeCode(name);
      const clash = await env.DB.prepare(`SELECT 1 FROM affiliates WHERE code = ? LIMIT 1`).bind(code).first();
      if (!clash) break;
      code = "";
    }
    if (!code) return Response.json({ ok: false, error: "code collision" }, { status: 500 });

    const token = makeToken();
    await env.DB.prepare(
      `INSERT INTO affiliates (code, token, name, phone, email, city, pan, upi_id, youtube_url, status, created_at)
       VALUES (?,?,?,?,?,?,?,?,?, 'active', datetime('now'))`
    )
      .bind(code, token, name, phone, email, city, pan, upiId, youtube)
      .run();

    return Response.json({ ok: true, code, token, ...links(code, token) });
  } catch {
    return Response.json({ ok: false, error: "server" }, { status: 500 });
  }
};
