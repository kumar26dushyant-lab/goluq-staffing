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
import { onRequestGet as publicConfig } from "../functions/api/config";
import { onRequestPost as lead } from "../functions/api/lead";
import { onRequestPost as affRegister } from "../functions/api/affiliate/register";
import { onRequestPost as affTrack } from "../functions/api/affiliate/track";
import { onRequestGet as affStats } from "../functions/api/affiliate/stats";
import { onRequestPost as affAuth } from "../functions/api/affiliate/auth";
import { onRequestGet as adminCommissionGet, onRequestPost as adminCommissionPost } from "../functions/api/admin/commission";
import { onRequestGet as adminLeads } from "../functions/api/admin/leads";
import { onRequestGet as adminStats } from "../functions/api/admin/stats";
import { onRequestPost as adminLead } from "../functions/api/admin/lead";
import { onRequestGet as adminAffiliates } from "../functions/api/admin/affiliates";
import { onRequestGet as adminSettingsGet, onRequestPost as adminSettingsPost } from "../functions/api/admin/settings";
import { onRequest as cronFollowups } from "../functions/api/cron/followups";
import { onRequestPost as waWebhook } from "../functions/api/wa/webhook";
import { onRequestGet as waMetaVerify, onRequestPost as waMetaInbound } from "../functions/api/wa/meta";
import { onRequestGet as waCheckGet, onRequestPost as waCheckPost } from "../functions/api/admin/wa-check";
import { onRequestGet as adminProjectsGet, onRequestPost as adminProjectsPost } from "../functions/api/admin/projects";
import { onRequestGet as adminCampaignsGet, onRequestPost as adminCampaignsPost } from "../functions/api/admin/campaigns";
import { onRequestPost as adminMarketing } from "../functions/api/admin/marketing";
import { onRequestGet as adminTestimonialsGet, onRequestPost as adminTestimonialsPost } from "../functions/api/admin/testimonials";
import { onRequestGet as publicTestimonials } from "../functions/api/testimonials";
import { onRequestPost as tgWebhook } from "../functions/api/tg/webhook";
import { onRequestGet as tgCheckGet, onRequestPost as tgCheckPost } from "../functions/api/admin/tg-check";
import { onRequestGet as adminToday } from "../functions/api/admin/today";
import { onRequestPost as bookingsInbound } from "../functions/api/bookings/inbound";
import { checkAdmin } from "../functions/lib/admin";
import { writeFileSync, existsSync, statSync, createReadStream } from "node:fs";
import { extname, basename } from "node:path";
import { randomBytes } from "node:crypto";
import { onRequestGet as custAuthGet, onRequestPost as custAuthPost } from "../functions/api/customer/auth";
import { onRequestGet as custProjectsGet, onRequestPost as custProjectsPost } from "../functions/api/customer/projects";
import { onRequestPost as track } from "../functions/api/track";
import { onRequestGet as adminVisitors } from "../functions/api/admin/visitors";
import { onRequestPost as chat } from "../functions/api/chat";
import { onRequestGet as adminChatsGet, onRequestPost as adminChatsPost } from "../functions/api/admin/chats";
import { onRequestGet as adminPricingGet, onRequestPost as adminPricingPost } from "../functions/api/admin/pricing";
import { onRequestGet as adminAuthGet, onRequestPost as adminAuthPost } from "../functions/api/admin/auth";
import { onRequestPost as emailInbound } from "../functions/api/email/inbound";
import { onRequestGet as adminEmailsGet, onRequestPost as adminEmailsPost } from "../functions/api/admin/emails";
import { onRequestGet as adminContentGet, onRequestPost as adminContentPost } from "../functions/api/admin/content";

const ROOT = process.cwd();
const DIST = join(ROOT, "dist");

// ── SQLite (replaces D1) ────────────────────────────────────────────────────
const DATA_DIR = join(ROOT, "data");
mkdirSync(DATA_DIR, { recursive: true });
const sqlite = new Database(join(DATA_DIR, "goluq.db"));
sqlite.pragma("journal_mode = WAL");
sqlite.exec(readFileSync(join(ROOT, "schema.sql"), "utf8"));

// Additive migrations for databases created before a column existed. schema.sql
// is re-exec'd on every boot, so ALTERs can't live there (they'd throw on the
// second start) — each one is attempted and its "duplicate column" ignored.
for (const sql of [
  `ALTER TABLE leads ADD COLUMN session_id TEXT`,
  `ALTER TABLE leads ADD COLUMN source TEXT`,
  `ALTER TABLE leads ADD COLUMN landing TEXT`,
  // Conversion tracking — what turns a lead into recurring affiliate commission.
  `ALTER TABLE leads ADD COLUMN converted_at TEXT`,
  `ALTER TABLE leads ADD COLUMN plan_id TEXT`,
  `ALTER TABLE leads ADD COLUMN plan_price_inr REAL`,
  // Affiliates get a real login instead of a secret URL.
  `ALTER TABLE affiliates ADD COLUMN pass_hash TEXT`,
  `ALTER TABLE affiliates ADD COLUMN reset_token TEXT`,
  `ALTER TABLE affiliates ADD COLUMN reset_expires TEXT`,
  // Communication services live alongside software builds in the same table.
  `ALTER TABLE pricing ADD COLUMN category TEXT DEFAULT 'build'`,
  // Per-conversation switch for the guide, so a manual reply is a pause, not a mute.
  `ALTER TABLE chat_sessions ADD COLUMN bot_off INTEGER DEFAULT 0`,
  // Productised offers carry an explicit USD price; the INR × multiplier band
  // gives ~$4,500 for ₹1L, and the agreed international price is $2,900.
  `ALTER TABLE pricing ADD COLUMN price_intl_usd INTEGER`,
  // Profit-based partner commission: a project knows what it cost, which kind
  // of work it is, and which partner introduced the customer.
  `ALTER TABLE projects ADD COLUMN kind TEXT DEFAULT 'build'`,
  `ALTER TABLE projects ADD COLUMN cost_inr INTEGER DEFAULT 0`,
  `ALTER TABLE projects ADD COLUMN ref_code TEXT`,
  `ALTER TABLE commissions ADD COLUMN project_id INTEGER`,
  `ALTER TABLE commissions ADD COLUMN basis_inr REAL`,
  `ALTER TABLE commissions ADD COLUMN note TEXT`,
]) {
  try {
    sqlite.exec(sql);
  } catch {
    /* column already present */
  }
}

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
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  INBOUND_SECRET: process.env.INBOUND_SECRET,
  MAIL_API_KEY: process.env.MAIL_API_KEY,
  MAIL_FROM: process.env.MAIL_FROM,
  MAIL_PROVIDER: process.env.MAIL_PROVIDER,
  // Official WhatsApp Business Platform. Env wins; anything omitted here is
  // read from the cockpit settings instead (functions/lib/whatsapp.ts).
  WA_PHONE_NUMBER_ID: process.env.WA_PHONE_NUMBER_ID,
  WA_WABA_ID: process.env.WA_WABA_ID,
  WA_ACCESS_TOKEN: process.env.WA_ACCESS_TOKEN,
  WA_VERIFY_TOKEN: process.env.WA_VERIFY_TOKEN,
  WA_APP_SECRET: process.env.WA_APP_SECRET,
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

// ── In-memory rate limiting (per client IP) — blocks form/endpoint abuse ─────
const rlStore = new Map<string, { count: number; reset: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rlStore) if (now > v.reset) rlStore.delete(k);
}, 5 * 60 * 1000).unref?.();

function rateLimited(ip: string, bucket: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const key = `${ip}|${bucket}`;
  const e = rlStore.get(key);
  if (!e || now > e.reset) {
    rlStore.set(key, { count: 1, reset: now + windowMs });
    return false;
  }
  e.count += 1;
  return e.count > max;
}

const clientIp = (c: { req: { header: (k: string) => string | undefined } }) =>
  c.req.header("cf-connecting-ip") ||
  (c.req.header("x-forwarded-for") || "").split(",")[0].trim() ||
  "unknown";

// ── Admin brute-force lockout — repeated wrong secret → temporary block ──────
const failStore = new Map<string, { fails: number; until: number }>();
app.use("/api/admin/*", async (c, next) => {
  const ip = clientIp(c);
  const e = failStore.get(ip);
  if (e && e.fails >= 8 && Date.now() < e.until) {
    return c.json({ ok: false, error: "too_many_attempts" }, 429);
  }
  await next();
  if (c.res.status === 401) {
    const cur = failStore.get(ip) ?? { fails: 0, until: 0 };
    failStore.set(ip, { fails: cur.fails + 1, until: Date.now() + 15 * 60 * 1000 });
  } else if (c.res.status < 400) {
    failStore.delete(ip);
  }
});

app.use("/api/*", async (c, next) => {
  const ip = clientIp(c);
  const path = new URL(c.req.url).pathname;
  // Tighter caps on the write/abuse-prone endpoints; generous otherwise.
  let max = 120;
  const write = c.req.method === "POST";
  if (write && (path === "/api/lead" || path === "/api/assistant" || path === "/api/affiliate/register" || path === "/api/affiliate/auth" || path === "/api/customer/auth")) max = 15;
  else if (path === "/api/chat") max = 240;
  else if (path.startsWith("/api/admin/") || path.startsWith("/api/wa/") || path.startsWith("/api/tg/")) max = 300;
  if (rateLimited(ip, path, max, 60_000)) {
    return c.json({ ok: false, error: "rate_limited" }, 429);
  }
  await next();
});

// ── API routes → existing handlers ──────────────────────────────────────────
app.post("/api/assistant", (c) => callFn(assistant as Handler, c.req.raw));
app.get("/api/config", (c) => callFn(publicConfig as Handler, c.req.raw));
app.post("/api/lead", (c) => callFn(lead as Handler, c.req.raw));
app.post("/api/track", (c) => callFn(track as Handler, c.req.raw));
app.post("/api/chat", (c) => callFn(chat as Handler, c.req.raw));
app.post("/api/affiliate/register", (c) => callFn(affRegister as Handler, c.req.raw));
app.post("/api/affiliate/track", (c) => callFn(affTrack as Handler, c.req.raw));
app.get("/api/affiliate/stats", (c) => callFn(affStats as Handler, c.req.raw));
app.post("/api/affiliate/auth", (c) => callFn(affAuth as Handler, c.req.raw));
app.get("/api/admin/commission", (c) => callFn(adminCommissionGet as Handler, c.req.raw));
app.post("/api/admin/commission", (c) => callFn(adminCommissionPost as Handler, c.req.raw));
app.get("/api/admin/wa-check", (c) => callFn(waCheckGet as Handler, c.req.raw));
app.post("/api/admin/wa-check", (c) => callFn(waCheckPost as Handler, c.req.raw));
app.get("/api/admin/projects", (c) => callFn(adminProjectsGet as Handler, c.req.raw));
app.post("/api/admin/projects", (c) => callFn(adminProjectsPost as Handler, c.req.raw));
app.get("/api/admin/campaigns", (c) => callFn(adminCampaignsGet as Handler, c.req.raw));
app.post("/api/admin/campaigns", (c) => callFn(adminCampaignsPost as Handler, c.req.raw));
app.post("/api/admin/marketing", (c) => callFn(adminMarketing as Handler, c.req.raw));
app.get("/api/admin/testimonials", (c) => callFn(adminTestimonialsGet as Handler, c.req.raw));
app.post("/api/admin/testimonials", (c) => callFn(adminTestimonialsPost as Handler, c.req.raw));
app.get("/api/testimonials", (c) => callFn(publicTestimonials as Handler, c.req.raw));
app.post("/api/tg/webhook", (c) => callFn(tgWebhook as Handler, c.req.raw));
app.get("/api/admin/tg-check", (c) => callFn(tgCheckGet as Handler, c.req.raw));
app.get("/api/admin/today", (c) => callFn(adminToday as Handler, c.req.raw));
app.post("/api/bookings/inbound", (c) => callFn(bookingsInbound as Handler, c.req.raw));
app.post("/api/admin/tg-check", (c) => callFn(tgCheckPost as Handler, c.req.raw));

// ── Uploads ──────────────────────────────────────────────────────────────────
// Native to this server on purpose: the portable handlers cannot touch a disk.
// Files land in data/uploads under a random name (never the client's filename,
// which is attacker-controlled) and are served back read-only from /media.
const UPLOAD_DIR = join(DATA_DIR, "uploads");
mkdirSync(UPLOAD_DIR, { recursive: true });
const UPLOAD_MAX = 200 * 1024 * 1024;
const UPLOAD_TYPES: Record<string, string> = {
  "video/mp4": ".mp4", "video/webm": ".webm",
  "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp",
};

app.post("/api/admin/upload", async (c) => {
  if (!(await checkAdmin(c.req.raw, env as { DB: unknown; ADMIN_SECRET?: string }))) {
    return c.json({ ok: false, error: "unauthorised" }, 401);
  }
  const body = await c.req.parseBody();
  const file = body["file"];
  if (!(file instanceof File)) return c.json({ ok: false, error: "No file." }, 400);
  const ext = UPLOAD_TYPES[file.type];
  if (!ext) return c.json({ ok: false, error: "Only MP4/WebM video or JPG/PNG/WebP images." }, 400);
  if (file.size > UPLOAD_MAX) return c.json({ ok: false, error: "Keep it under 200 MB." }, 400);
  const name = randomBytes(12).toString("hex") + ext;
  writeFileSync(join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return c.json({ ok: true, path: "/media/" + name });
});

const MEDIA_TYPES: Record<string, string> = {
  ".mp4": "video/mp4", ".webm": "video/webm",
  ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
};
app.get("/media/:name", (c) => {
  // basename() strips any path the URL tried to smuggle in.
  const name = basename(c.req.param("name"));
  const file = join(UPLOAD_DIR, name);
  const type = MEDIA_TYPES[extname(name).toLowerCase()];
  if (!type || !existsSync(file)) return c.notFound();
  const size = statSync(file).size;
  // Range support so a phone can seek inside a video instead of reloading it.
  const range = c.req.header("range");
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    const start = m && m[1] ? Number(m[1]) : 0;
    const end = m && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    const stream = createReadStream(file, { start, end });
    return new Response(stream as unknown as ReadableStream, {
      status: 206,
      headers: {
        "content-type": type,
        "content-range": `bytes ${start}-${end}/${size}`,
        "accept-ranges": "bytes",
        "content-length": String(end - start + 1),
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  }
  return new Response(createReadStream(file) as unknown as ReadableStream, {
    headers: {
      "content-type": type,
      "content-length": String(size),
      "accept-ranges": "bytes",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
});
app.get("/api/customer/auth", (c) => callFn(custAuthGet as Handler, c.req.raw));
app.post("/api/customer/auth", (c) => callFn(custAuthPost as Handler, c.req.raw));
app.get("/api/customer/projects", (c) => callFn(custProjectsGet as Handler, c.req.raw));
app.post("/api/customer/projects", (c) => callFn(custProjectsPost as Handler, c.req.raw));
app.get("/api/admin/stats", (c) => callFn(adminStats as Handler, c.req.raw));
app.get("/api/admin/leads", (c) => callFn(adminLeads as Handler, c.req.raw));
app.post("/api/admin/lead", (c) => callFn(adminLead as Handler, c.req.raw));
app.get("/api/admin/affiliates", (c) => callFn(adminAffiliates as Handler, c.req.raw));
app.get("/api/admin/visitors", (c) => callFn(adminVisitors as Handler, c.req.raw));
app.get("/api/admin/chats", (c) => callFn(adminChatsGet as Handler, c.req.raw));
app.post("/api/admin/chats", (c) => callFn(adminChatsPost as Handler, c.req.raw));
app.post("/api/email/inbound", (c) => callFn(emailInbound as Handler, c.req.raw));
app.get("/api/admin/content", (c) => callFn(adminContentGet as Handler, c.req.raw));
app.post("/api/admin/content", (c) => callFn(adminContentPost as Handler, c.req.raw));
app.get("/api/admin/emails", (c) => callFn(adminEmailsGet as Handler, c.req.raw));
app.post("/api/admin/emails", (c) => callFn(adminEmailsPost as Handler, c.req.raw));
app.get("/api/admin/auth", (c) => callFn(adminAuthGet as Handler, c.req.raw));
app.post("/api/admin/auth", (c) => callFn(adminAuthPost as Handler, c.req.raw));
app.get("/api/admin/pricing", (c) => callFn(adminPricingGet as Handler, c.req.raw));
app.post("/api/admin/pricing", (c) => callFn(adminPricingPost as Handler, c.req.raw));
app.get("/api/admin/settings", (c) => callFn(adminSettingsGet as Handler, c.req.raw));
app.post("/api/admin/settings", (c) => callFn(adminSettingsPost as Handler, c.req.raw));
app.all("/api/cron/followups", (c) => callFn(cronFollowups as Handler, c.req.raw));
app.post("/api/wa/webhook", (c) => callFn(waWebhook as Handler, c.req.raw));
// Official WhatsApp Business Platform. GET is Meta verifying the callback URL,
// POST is a real customer message. Both must live at the SAME path — that single
// URL is what gets pasted into the Meta dashboard.
app.get("/api/wa/meta", (c) => callFn(waMetaVerify as Handler, c.req.raw));
app.post("/api/wa/meta", (c) => callFn(waMetaInbound as Handler, c.req.raw));
app.all("/api/*", (c) => c.json({ ok: false, error: "not_found" }, 404));

// ── Static SPA (dist) + client-route fallback ───────────────────────────────
const indexHtml = readFileSync(join(DIST, "index.html"), "utf8");
// Legal pages are served as plain HTML at clean URLs, NOT as SPA routes.
// Meta, and every other reviewer, opens these to check they are real — and some
// checkers do not run JavaScript at all. Behind the SPA fallback the URL
// /privacy answered 200 with the marketing homepage, which is exactly the kind
// of "working" link that fails a review.
for (const [route, file] of [
  ["/privacy", "privacy.html"],
  ["/terms", "terms.html"],
  ["/social-kit", "social-kit.html"],
] as const) {
  app.get(route, (c) => c.html(readFileSync(join(DIST, file), "utf8")));
}

app.use("/*", serveStatic({ root: "./dist" }));
app.get("*", (c) => {
  // A request for a FILE that doesn't exist must 404, not fall through to the
  // SPA shell. Otherwise a missing /audio/*.mp3 resolves to HTML and the browser
  // fails at decode time instead of at fetch time — which hides genuinely
  // missing assets and breaks any HEAD-based existence check.
  const path = new URL(c.req.url).pathname;
  if (/\.[a-z0-9]{2,5}$/i.test(path) && !path.endsWith(".html")) {
    return c.notFound();
  }
  return c.html(indexHtml);
});

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
