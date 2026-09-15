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

## Part C — after the move
- Owner: nothing, except one Contabo snapshot before deletion.
- Rollback at any point: flip the DNS records back; the Contabo copy stays
  untouched until step 6.
