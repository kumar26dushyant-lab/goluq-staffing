# Moving goluq.com to Oracle Cloud (Mumbai) — steps

Why: every cockpit call from India to the Contabo origin in Europe costs
250–900 ms of round trip; the same call from a Mumbai origin is ~30–60 ms.
Contabo stays for sarathi-ai.com and nidaanpartner.com unless they move too.

## Part A — owner (or the browser extension), Oracle console, ~20 minutes

Tenancy: sarathiaicom · region India West (Mumbai). Always Free A1 is
2 OCPU / 12 GB total; use all of it for one instance.

1. **Upgrade to Pay As You Go** (once): cloud.oracle.com → menu → Billing &
   Cost Management → Upgrade and Manage Payment → Pay As You Go → add a
   card. Always Free resources stay free; this stops idle-instance
   reclamation and unlocks A1 capacity in Mumbai. Expect ₹0 on the bill for
   this setup.
2. **Network**: menu → Networking → Virtual Cloud Networks → Start VCN
   Wizard → "Create VCN with Internet Connectivity" → name `goluq-vcn` →
   defaults → Create.
3. **Security list** (open the web ports): the VCN → Subnets → the public
   subnet → Security Lists → Default Security List → Add Ingress Rules:
   - Source `0.0.0.0/0`, protocol TCP, destination port `80`
   - Source `0.0.0.0/0`, protocol TCP, destination port `443`
   (22 exists already.) Cloudflare-only filtering happens on the VM's own
   firewall, as on Contabo.
4. **Instance**: menu → Compute → Instances → Create instance.
   - Name `goluq-mumbai`
   - Image: **Canonical Ubuntu 24.04** (aarch64); Shape: **Ampere A1.Flex**,
     2 OCPU, 12 GB.
   - Networking: `goluq-vcn`, public subnet, **Assign a public IPv4 address**.
   - Add SSH keys → **Paste public keys** → paste exactly:
     ```
     ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILTQjoIGquJdaAHopFwZzjT2CLdnb/pXi+ZxgJyLGVDP imdus@Dushyant
     ```
     (that is Claude's key on your PC; keep your own key too if you have one)
   - Boot volume: 50 GB is plenty. Create.
   - If "Out of host capacity" appears: retry every few hours, or try a
     different availability domain; Pay As You Go tenancies get priority.
5. Copy the instance's **Public IP** and send it in chat: "Oracle IP: x.x.x.x".

## Part B — Claude, over SSH, ~1 hour (nothing for you to do)

1. `ssh ubuntu@IP` → become root, apt update, install nginx, certbot,
   Node 20 (arm64), sqlite3, ffmpeg, ufw, fail2ban, unattended-upgrades.
2. Harden exactly as Contabo (`harden.sh`): key-only SSH, ufw 22 + 80/443
   from Cloudflare ranges only, nightly backups.
3. Copy `/opt/goluq` (code, `.env`, `data/goluq.db`, `data/uploads`) with
   rsync from Contabo; `npm ci`; systemd unit; nginx site with the same
   limits and headers; certbot certificate for goluq.com + www.
4. Run both origins in parallel; test the new one via Cloudflare with the
   `Host` header before switching.
5. **Switch**: Cloudflare DNS → goluq.com and www A records → new IP
   (proxied). Cron jobs (follow-ups, briefs, payments, posts, backups)
   re-created on the new box and removed from Contabo for goluq only.
6. Watch for a week (Telegram alerts, quality watch, posts). Then delete
   `/opt/goluq` from Contabo and its nginx site; Contabo keeps the other two.

## Status 2026-09-17
Part A done by the owner's extension (instance goluq-mumbai, 152.67.29.92,
2 OCPU / 12 GB). Part B done: stack installed, hardened (key-only SSH,
Cloudflare-only firewall, backups), app + database snapshot + uploads +
certificates copied, built for arm64, service and crons live, TLS answering
on the new box. Waiting for the DNS flip (Part C-1 below).

## Status 2026-09-17, later — SWITCHED
Mumbai is the only live origin since 2026-09-17 00:20 CEST: the Contabo app
is stopped and its goluq crons removed; Contabo's nginx forwards goluq.com
to https://152.67.29.92 (Cloudflare's visitor IP passed through, trusted by
Mumbai). Mumbai's crons are armed. Deploys now run on Mumbai:
`ssh ubuntu@152.67.29.92 'sudo bash /opt/goluq/deploy/update.sh'`.
The DNS flip below needs no coordination any more — it only removes the
Europe hop (≈1 s → ≈0.3 s per request). Rollback for a week: start the
Contabo app and restore /etc/nginx/sites-available/goluq.com.local-backup
(Contabo's data would then be a day-old snapshot; Mumbai stays primary).

## Part C-1 — the flip (owner / extension, any time now)
At dash.cloudflare.com → goluq.com → DNS → Records:
1. Edit the **A** record `goluq.com` → IPv4 `152.67.29.92`, Proxy status ON
   (orange cloud) → Save.
2. Edit the **A** record `www` → `152.67.29.92`, proxied → Save.
3. If any **AAAA** record exists for goluq.com or www, delete it (the Oracle
   box has no IPv6).
4. Reply "flipped". Claude verifies latency dropped and that certbot on
   Mumbai can renew.

## Part C — after the move
- Owner: nothing, except one Contabo snapshot before deletion.
- Rollback at any point: flip the DNS records back; the Contabo copy stays
  untouched until step 6.
