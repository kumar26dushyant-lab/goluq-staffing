/// <reference types="@cloudflare/workers-types" />

/**
 * Owner login for the cockpit: username + a password the owner chooses via a
 * one-time setup link.
 *
 * Design notes:
 *  - Passwords are PBKDF2-SHA256 with a per-password random salt. WebCrypto is
 *    available in both Node 18+ and Workers, so this needs no dependency and
 *    behaves identically on either runtime.
 *  - Login issues an opaque random session token stored server-side with an
 *    expiry, so a stolen token can be revoked and does not encode anything.
 *  - ADMIN_SECRET keeps working as a break-glass credential (and for cron). If
 *    the password is ever lost, a new setup link is minted with it over SSH.
 */

const ITERATIONS = 210_000; // OWASP-recommended floor for PBKDF2-SHA256
const SESSION_DAYS = 30;

function b64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function unb64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function randomToken(bytes = 32): string {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations, hash: "SHA-256" },
    key,
    256
  );
  return b64(bits);
}

/** Stored form: pbkdf2$<iterations>$<saltB64>$<hashB64> */
export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const hash = await pbkdf2(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${b64(salt.buffer)}$${hash}`;
}

/** Constant-time string compare so verification can't be timed. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, iterStr, saltB64, hashB64] = stored.split("$");
    if (scheme !== "pbkdf2") return false;
    const got = await pbkdf2(password, unb64(saltB64), Number(iterStr));
    return safeEqual(got, hashB64);
  } catch {
    return false;
  }
}

export interface AuthRow {
  username: string | null;
  pass_hash: string | null;
  setup_token: string | null;
  setup_expires: string | null;
}

export async function getAuth(db: D1Database): Promise<AuthRow | null> {
  return db
    .prepare(`SELECT username, pass_hash, setup_token, setup_expires FROM admin_auth WHERE id = 1`)
    .first<AuthRow>();
}

/** Creates a single-use setup link valid for 24h and returns its token. */
export async function mintSetupToken(db: D1Database, username?: string): Promise<string> {
  const token = randomToken(24);
  await db
    .prepare(
      `INSERT INTO admin_auth (id, username, setup_token, setup_expires, updated_at)
       VALUES (1, ?, ?, datetime('now','+1 day'), datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         username = COALESCE(NULLIF(excluded.username,''), admin_auth.username),
         setup_token = excluded.setup_token,
         setup_expires = excluded.setup_expires,
         updated_at = datetime('now')`
    )
    .bind(username ?? "", token)
    .run();
  return token;
}

export async function setupTokenValid(db: D1Database, token: string): Promise<boolean> {
  if (!token) return false;
  const row = await db
    .prepare(
      `SELECT 1 AS ok FROM admin_auth
        WHERE id = 1 AND setup_token = ? AND setup_expires > datetime('now')`
    )
    .bind(token)
    .first<{ ok: number }>();
  return !!row;
}

/** Consumes the setup token so the link cannot be replayed. */
export async function setPassword(db: D1Database, password: string): Promise<void> {
  const hash = await hashPassword(password);
  await db
    .prepare(
      `UPDATE admin_auth
          SET pass_hash = ?, setup_token = NULL, setup_expires = NULL, updated_at = datetime('now')
        WHERE id = 1`
    )
    .bind(hash)
    .run();
  // Any existing sessions are invalidated — a password change should log out
  // every other device.
  await db.prepare(`DELETE FROM admin_sessions`).run();
}

export async function createSession(db: D1Database): Promise<string> {
  const token = randomToken(32);
  await db
    .prepare(
      `INSERT INTO admin_sessions (token, created_at, expires_at)
       VALUES (?, datetime('now'), datetime('now', ?))`
    )
    .bind(token, `+${SESSION_DAYS} days`)
    .run();
  return token;
}

export async function sessionValid(db: D1Database, token: string): Promise<boolean> {
  if (!token || token.length < 32) return false;
  const row = await db
    .prepare(`SELECT 1 AS ok FROM admin_sessions WHERE token = ? AND expires_at > datetime('now')`)
    .bind(token)
    .first<{ ok: number }>();
  return !!row;
}

export async function destroySession(db: D1Database, token: string): Promise<void> {
  await db.prepare(`DELETE FROM admin_sessions WHERE token = ?`).bind(token).run();
}
