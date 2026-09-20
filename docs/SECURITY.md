# Security and privacy — what protects goluq.com (2026-09-13)

Where it runs: one Contabo VM (Ubuntu 24.04, IP in deploy/), Node 20 + Hono
on 127.0.0.1:8090 behind nginx, all three sites (goluq.com, sarathi-ai.com,
nidaanpartner.com) proxied by Cloudflare. SQLite on disk, secrets in
`/opt/goluq/.env` (600) and write-only cockpit settings.

## Perimeter
- **Firewall (ufw):** inbound only 22 (SSH, keys only) and 80/443 **from
  Cloudflare's published ranges**. The origin IP answers nobody else, so
  Cloudflare's WAF, bot fight mode and rate limits cannot be bypassed.
  Consequence: if Cloudflare proxying is ever switched off for a domain, that
  domain stops responding until it is proxied again or `/root/harden.sh` is
  edited. Cloudflare ranges refresh by re-running the script.
- **SSH:** password login off (cloud-init had re-enabled it; overridden),
  root only by key, fail2ban on, unattended security updates on.
- **nginx:** real client IP from `CF-Connecting-IP`; per-IP `limit_req`
  zones (api 60/min, auth 5/min, webhooks 30/min, general 200/min); body
  size caps; HSTS, CSP, nosniff, frame-options, referrer policy; cockpit
  marked noindex.
- **App:** second per-IP rate limiter (writes 15/min, chat 240/min); admin
  brute-force lockout after 8 failures; uncaught errors logged, never fatal.

## Doors and what guards each
| Door | Guard |
|---|---|
| Website chat `/api/chat`, `/api/assistant` | rate limit; text only, clipped; the guide has no tools — it can only talk |
| WhatsApp webhook `/api/wa/meta` | Meta HMAC signature (app secret), replay-safe by message id |
| Customer Telegram bot `/api/tg/public` | Telegram secret-token header |
| Owner Telegram bot `/api/tg/webhook` | secret-token header + owner chat id pairing |
| Calendar bridge `/api/bookings/inbound` | shared secret minted by the cockpit |
| Razorpay / Dodo webhooks | HMAC signatures, replay window |
| Sign-in `/api/auth/*` | 6-digit codes hashed, 10-minute life, 5 tries, 5 sends/hour; Google OAuth state row |
| Intake `/api/intake` | customer session required; audio ≤ 12 MB, clipped text |
| Cockpit `/api/admin/*` | admin secret or session; lockout |
| Media `/media/*` | read-only, basename() against path traversal, extension whitelist, buffered slices |
| Uploads | cockpit only (Store photos, generated images) |

## Data
- Visits table is non-identifying (no IP, no cookie). Leads, chats, briefs,
  payments hold customer contact data and live only on the VM; the cockpit is
  the only reader. Public `/api/config` exposes no secrets.
- User-supplied text is HTML-escaped before Telegram and rendered as text in
  React; SQL is parameterised everywhere.
- Prompt injection: customer text reaches Gemini only inside prompts that
  produce text or a product-card id from an allow-list; there is no tool the
  model can call. The BRD it drafts is shown back to the same customer.
- Secrets: never in the repo (`Business plan/`, `marketing/` ignored; tokens
  write-only). Anything pasted into a chat is rotated afterwards.

## Backups
- Nightly `sqlite3 .backup` at 03:20 to `/opt/goluq/backups` (gzip, 600, 14
  kept). Off-box copy: owner task — Contabo snapshot weekly, or an rclone
  job to a private bucket (needs a key; not set up yet).

## Owner tasks at Cloudflare (10 minutes)
1. Security → Bots → **Bot Fight Mode** on.
2. Security → WAF → Managed rules: **Cloudflare Managed Ruleset** on (free).
3. Security → WAF → Rate limiting rules: `/api/*` 100 requests / 1 minute per
   IP → block 10 minutes.
4. SSL/TLS → **Full (strict)**; Edge Certificates → Always Use HTTPS on.
5. Optional: Turnstile on the sign-in step of /start if code-request abuse
   ever appears in the logs.

## What to do if something looks wrong
- Cockpit Settings → WhatsApp shows the number's quality; the hourly cron
  alerts on a drop.
- `journalctl -u goluq -n 200` for the app; `/var/log/nginx/access.log` for
  who hit what; `fail2ban-client status sshd` for SSH attempts.
- Rotate: WhatsApp token (Business Settings → System users), Telegram bots
  (@BotFather /revoke), Razorpay/Dodo keys, admin secret (`.env`).

## Off-site backups (2026-09-20)
Every nightly `.db.gz` is also uploaded to the Cloud Storage bucket
`goluq-backups-mum` (asia-south1, uniform access, public access
prevention, 45-day lifecycle delete) by `/usr/local/bin/gcs-upload`, using
the service account `backup-writer` which holds only Storage Object
Creator: it can add objects, never list, read or delete them, so a stolen
server key cannot erase history. Key at /opt/goluq/gcs-backup.json (600,
root), outside the repo. The server keeps 14 local copies.
