/// <reference types="@cloudflare/workers-types" />

/**
 * Worker entry (Cloudflare Workers + Static Assets). Routes /api/* to the
 * existing Pages-style Function handlers and serves the built SPA (dist) with
 * SPA fallback. Also applies hardened security headers to every response.
 *
 * Why a Worker (not Pages): the project is deployed via `wrangler deploy`. This
 * router lets us keep all function code unchanged while deploying as a Worker.
 */
import { onRequestPost as lead } from "./functions/api/lead";
import { onRequestPost as affRegister } from "./functions/api/affiliate/register";
import { onRequestPost as affTrack } from "./functions/api/affiliate/track";
import { onRequestGet as affStats } from "./functions/api/affiliate/stats";
import { onRequestPost as affConvert } from "./functions/api/affiliate/convert";
import { onRequestPost as waConnect } from "./functions/api/admin/wa-connect";
import { onRequestGet as waStatus } from "./functions/api/admin/wa-status";
import { onRequestGet as adminLeads } from "./functions/api/admin/leads";
import { onRequest as cronFollowups } from "./functions/api/cron/followups";
import { onRequestPost as waWebhook } from "./functions/api/wa/webhook";

interface Env {
  ASSETS: Fetcher;
  [key: string]: unknown;
}

type Ctx = Parameters<PagesFunction<any>>[0];
type Handler = (ctx: Ctx) => Response | Promise<Response>;

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=(), payment=(), usb=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "Cross-Origin-Opener-Policy": "same-origin",
  // CSP: no inline/eval scripts; allows Google Fonts + WebGL (blob/wasm). All
  // secrets (Gemini/Evolution) are server-side, so the browser only talks to 'self'.
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

function harden(resp: Response): Response {
  const r = new Response(resp.body, resp);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) r.headers.set(k, v);
  return r;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (path.startsWith("/api/")) {
      const pagesCtx = {
        request,
        env,
        waitUntil: ctx.waitUntil.bind(ctx),
        passThroughOnException: () => {},
        next: async () => new Response(null, { status: 404 }),
        params: {},
        data: {},
        functionPath: path,
      } as unknown as Ctx;

      const run = async (h: Handler) => harden(await h(pagesCtx));

      if (path === "/api/lead" && method === "POST") return run(lead);
      if (path === "/api/affiliate/register" && method === "POST") return run(affRegister);
      if (path === "/api/affiliate/track" && method === "POST") return run(affTrack);
      if (path === "/api/affiliate/stats" && method === "GET") return run(affStats);
      if (path === "/api/affiliate/convert" && method === "POST") return run(affConvert);
      if (path === "/api/admin/wa-connect" && method === "POST") return run(waConnect);
      if (path === "/api/admin/wa-status" && method === "GET") return run(waStatus);
      if (path === "/api/admin/leads" && method === "GET") return run(adminLeads);
      if (path === "/api/cron/followups") return run(cronFollowups);
      if (path === "/api/wa/webhook" && method === "POST") return run(waWebhook);

      return harden(Response.json({ ok: false, error: "not_found" }, { status: 404 }));
    }

    // Static assets + SPA fallback (configured via [assets] not_found_handling)
    return harden(await env.ASSETS.fetch(request));
  },
};
