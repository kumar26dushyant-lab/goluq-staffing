import "dotenv/config";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import Database from "better-sqlite3";
import { readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { D1 } from "./d1";

// Existing Cloudflare Function handlers — reused unchanged (web-standard Request/Response).
import { onRequestPost as assistant } from "../functions/api/assistant";
import { onRequestPost as lead } from "../functions/api/lead";
import { onRequestPost as affRegister } from "../functions/api/affiliate/register";
import { onRequestPost as affTrack } from "../functions/api/affiliate/track";
import { onRequestGet as affStats } from "../functions/api/affiliate/stats";
import { onRequestPost as affConvert } from "../functions/api/affiliate/convert";
import { onRequestPost as waConnect } from "../functions/api/admin/wa-connect";
import { onRequestGet as waStatus } from "../functions/api/admin/wa-status";
import { onRequestGet as adminLeads } from "../functions/api/admin/leads";
import { onRequest as cronFollowups } from "../functions/api/cron/followups";
import { onRequestPost as waWebhook } from "../functions/api/wa/webhook";

const ROOT = process.cwd();
const DIST = join(ROOT, "dist");

// ── SQLite (replaces D1) ────────────────────────────────────────────────────
const DATA_DIR = join(ROOT, "data");
mkdirSync(DATA_DIR, { recursive: true });
const sqlite = new Database(join(DATA_DIR, "goluq.db"));
sqlite.pragma("journal_mode = WAL");
sqlite.exec(readFileSync(join(ROOT, "schema.sql"), "utf8"));

// ── Env passed to handlers (DB + secrets from .env / process.env) ───────────
const env = {
  DB: new D1(sqlite),
  EVOLUTION_API_URL: process.env.EVOLUTION_API_URL,
  EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY,
  GOLUQ_WA_INSTANCE: process.env.GOLUQ_WA_INSTANCE || "goluq_main",
  OWNER_WHATSAPP: process.env.OWNER_WHATSAPP,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL,
  ADMIN_SECRET: process.env.ADMIN_SECRET || "",
} as Record<string, unknown>;

type Handler = (ctx: unknown) => Response | Promise<Response>;

function callFn(fn: Handler, request: Request): Response | Promise<Response> {
  const ctx = {
    request,
    env,
    waitUntil: (p: Promise<unknown>) => {
      Promise.resolve(p).catch(() => {});
    },
    passThroughOnException: () => {},
    next: async () => new Response(null, { status: 404 }),
    params: {},
    data: {},
    functionPath: new URL(request.url).pathname,
  };
  return fn(ctx);
}

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=(), payment=(), usb=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'wasm-unsafe-eval' blob:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; "),
};

const app = new Hono();

// Security headers on every response
app.use("*", async (c, next) => {
  await next();
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) c.res.headers.set(k, v);
});

// ── API routes → existing handlers ──────────────────────────────────────────
app.post("/api/assistant", (c) => callFn(assistant as Handler, c.req.raw));
app.post("/api/lead", (c) => callFn(lead as Handler, c.req.raw));
app.post("/api/affiliate/register", (c) => callFn(affRegister as Handler, c.req.raw));
app.post("/api/affiliate/track", (c) => callFn(affTrack as Handler, c.req.raw));
app.get("/api/affiliate/stats", (c) => callFn(affStats as Handler, c.req.raw));
app.post("/api/affiliate/convert", (c) => callFn(affConvert as Handler, c.req.raw));
app.post("/api/admin/wa-connect", (c) => callFn(waConnect as Handler, c.req.raw));
app.get("/api/admin/wa-status", (c) => callFn(waStatus as Handler, c.req.raw));
app.get("/api/admin/leads", (c) => callFn(adminLeads as Handler, c.req.raw));
app.all("/api/cron/followups", (c) => callFn(cronFollowups as Handler, c.req.raw));
app.post("/api/wa/webhook", (c) => callFn(waWebhook as Handler, c.req.raw));
app.all("/api/*", (c) => c.json({ ok: false, error: "not_found" }, 404));

// ── Static SPA (dist) + client-route fallback ───────────────────────────────
const indexHtml = readFileSync(join(DIST, "index.html"), "utf8");
app.use("/*", serveStatic({ root: "./dist" }));
app.get("*", (c) => c.html(indexHtml));

// ── Built-in daily follow-up scheduler (no external cron needed) ────────────
async function runFollowups() {
  try {
    const url = `http://localhost/api/cron/followups?secret=${encodeURIComponent(
      String(env.ADMIN_SECRET || "")
    )}`;
    await callFn(cronFollowups as Handler, new Request(url));
  } catch {
    /* ignore */
  }
}
setInterval(runFollowups, 24 * 60 * 60 * 1000); // once a day

const port = Number(process.env.PORT || 8090);
const hostname = process.env.HOST || "127.0.0.1";
serve({ fetch: app.fetch, port, hostname });
// eslint-disable-next-line no-console
console.log(`GoLuQ server listening on http://${hostname}:${port}`);
