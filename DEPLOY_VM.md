# Deploy GoLuQ on your Oracle VM (the easy path)

Same box and pattern as Sarathi/Nidaan. SQLite (no D1), a `.env` file (no dashboard),
Evolution on `localhost` (no public URL), Docker Compose + one nginx block.

## One-time setup (≈5 minutes, all familiar commands)

```bash
# 1. Clone next to your other apps
cd /opt   # or wherever Sarathi/Nidaan live
git clone https://github.com/kumar26dushyant-lab/goluq-staffing.git goluq
cd goluq

# 2. Config — copy the template and fill it in
cp goluq.env.example .env
nano .env
#   ADMIN_SECRET      → a long random string you invent
#   EVOLUTION_API_KEY → your key from wa_env_append.txt (adb349...)
#   EVOLUTION_API_URL → leave as http://127.0.0.1:8080 (works — same box)
#   GEMINI_API_KEY    → your Gemini key (optional but recommended)
#   OWNER_WHATSAPP    → leave blank for now

# 3. Build + run (like your Evolution stack)
docker compose up -d --build

# 4. Check it's up
curl -s http://127.0.0.1:8090/ | head -c 100   # should return HTML
```

## nginx + domain (same as Nidaan)

```bash
sudo cp deploy/nginx-goluq.conf /etc/nginx/sites-available/goluq.com
sudo ln -s /etc/nginx/sites-available/goluq.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d goluq.com -d www.goluq.com   # TLS
```
Point `goluq.com` (A record) → your VM IP in Cloudflare DNS. Done — site is live.

## Connect the GoLuQ WhatsApp number
Open `https://goluq.com/admin`, enter your `ADMIN_SECRET`, click **Connect WhatsApp**,
scan the QR with the new GoLuQ number (WhatsApp → Linked devices). The `/admin` page
also lists incoming leads. Leads + the smart chat work immediately; WhatsApp activates
once the number is connected.

## Updating later (whenever I push changes)
```bash
cd /opt/goluq && git pull && docker compose up -d --build
```

## Notes
- **Database** is a SQLite file at `./data/goluq.db` (auto-created; back it up by copying that file).
- **Follow-ups** (day 3/5/7/12) run automatically inside the container — no cron to set up.
- **Evolution**: GoLuQ uses its own instance `goluq_main`; it never touches the Sarathi/Nidaan instances.
- You can ignore/delete the old Cloudflare "goluq-staffing" Worker project — we're not using it.
