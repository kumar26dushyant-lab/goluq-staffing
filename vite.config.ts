import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Dev-only mock for the Cloudflare Pages Functions (which vite doesn't serve).
 * Lets you exercise the booking success path + ref tracking locally. In
 * production, the real /functions/api/* handlers run on Cloudflare. NOT bundled.
 */
function devApiMock(): Plugin {
  return {
    name: "goluq-dev-api-mock",
    apply: "serve",
    configureServer(server) {
      const origin = "http://localhost:5173";
      server.middlewares.use((req, res, next) => {
        const send = (obj: unknown) => {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(obj));
        };
        const url = req.url ?? "";
        if (!url.startsWith("/api/")) return next();

        // GET: token-gated dashboard stats (fake but shaped like production)
        if (req.method === "GET" && url.startsWith("/api/affiliate/stats")) {
          return send({
            ok: true,
            affiliate: { name: "Dev Partner", code: "DEV123", shareUrl: `${origin}/?ref=DEV123` },
            clicks: 42,
            leads: 7,
            conversions: 2,
            earnings: { pending: 5236, approved: 1499, paid: 0 },
            recent: [{ period_month: "2026-06", amount_inr: 524.65, status: "pending", created_at: "" }],
          });
        }

        if (req.method === "POST") {
          let body = "";
          req.on("data", (c) => (body += c));
          req.on("end", () => {
            // eslint-disable-next-line no-console
            console.log(`[dev-api] ${url}`, body);
            if (url.startsWith("/api/affiliate/register")) {
              return send({
                ok: true,
                code: "DEV123",
                token: "devtoken123",
                shareUrl: `${origin}/?ref=DEV123`,
                dashboardUrl: `${origin}/partner/dashboard?token=devtoken123`,
              });
            }
            send({ ok: true, dev: true });
          });
          return;
        }
        next();
      });
    },
  };
}

// Standalone /mockup* and /_legacy folders are static design archives — Vite only
// treats the root index.html as the app entry, so those folders are ignored by the build.
export default defineConfig({
  plugins: [react(), devApiMock()],
  server: { port: 5173, open: true },
  build: {
    outDir: "dist",
    // Keep the initial bundle lean (audience is on mid-range Android over patchy networks).
    target: "es2020",
  },
});
