/// <reference types="@cloudflare/workers-types" />

import { randomToken } from "./auth";

/**
 * Shared pieces of the customer portal: who is logged in, and what the stages
 * are. The stage list is defined ONCE here and used by both the customer view
 * and the cockpit, so the two can never disagree about where a project is.
 */
export const STAGES = [
  "requirements",
  "blueprint",
  "approval",
  "build",
  "testing",
  "delivery",
  "support",
] as const;

export type Stage = (typeof STAGES)[number];

export function isStage(v: unknown): v is Stage {
  return typeof v === "string" && (STAGES as readonly string[]).includes(v);
}

/** How far along a project is, 0..1 — for a progress bar that cannot lie. */
export function stageIndex(stage: string): number {
  const i = (STAGES as readonly string[]).indexOf(stage);
  return i < 0 ? 0 : i;
}

const SESSION_DAYS = 60;

export interface CustomerRow {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
}

export async function createCustomerSession(db: D1Database, customerId: number): Promise<string> {
  const token = randomToken(32);
  await db
    .prepare(
      `INSERT INTO customer_sessions (token, customer_id, created_at, expires_at)
       VALUES (?,?,datetime('now'), datetime('now', ?))`
    )
    .bind(token, customerId, `+${SESSION_DAYS} days`)
    .run();
  return token;
}

/**
 * Resolve the bearer token to a customer. Returns null for anything expired,
 * suspended or malformed — callers treat null as "not logged in" and must never
 * fall back to trusting an id supplied by the browser.
 */
export async function customerFromRequest(
  db: D1Database,
  request: Request
): Promise<CustomerRow | null> {
  const auth = request.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token || token.length < 32) return null;
  return db
    .prepare(
      `SELECT c.id, c.name, c.phone, c.email, c.company
         FROM customer_sessions s JOIN customers c ON c.id = s.customer_id
        WHERE s.token = ? AND s.expires_at > datetime('now') AND c.status = 'active'`
    )
    .bind(token)
    .first<CustomerRow>();
}

/** 401 in the shape the portal front-end expects. */
export function notLoggedIn(): Response {
  return Response.json({ ok: false, error: "not_logged_in" }, { status: 401 });
}
