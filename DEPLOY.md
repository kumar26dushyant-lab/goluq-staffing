# GoLuQ — deploy & backend setup

The site is a static SPA (Vite) + Cloudflare **Pages Functions** (`/functions/api/*`) backed by **D1**. In `npm run dev`, the functions aren't served by Vite — a dev-only mock (`vite.config.ts → devApiMock`) answers `/api/*` with `{ ok: true }` so the booking success path and ref-tracking are testable locally. Production uses the real handlers.

## 1. Create the D1 database
```bash
npx wrangler d1 create goluq-leads
# → copy the printed database_id into wrangler.toml
npx wrangler d1 execute goluq-leads --file=./schema.sql --remote
```

## 2. Run with real functions locally (optional)
```bash
npm run build
npx wrangler pages dev dist --d1 DB=goluq-leads
```

## 3. Deploy (DNS already on Cloudflare)
1. Push to GitHub.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → select repo.
   - Build command: `npm run build`
   - Output dir: `dist`
3. After first deploy → **Settings → Functions → D1 bindings**: add `DB` → `goluq-leads`.
4. **Settings → Environment variables** (encrypted): add `ADMIN_SECRET` (used by `/api/affiliate/convert`), later `MSG91_KEY` for OTP.
5. **Custom domains** → add `goluq.com` (+ `www`). SSL provisions automatically.
6. Re-deploy. Verify a test lead:
```bash
npx wrangler d1 execute goluq-leads --command "SELECT * FROM leads" --remote
```

## Endpoints
| Route | Method | Purpose | Status |
|---|---|---|---|
| `/api/lead` | POST | Lead capture (+ `ref_code`) | ✅ built |
| `/api/affiliate/track` | POST | Record a referral click | ✅ built |
| `/api/affiliate/register` | POST | Create affiliate, return code + token | ⏳ Phase F-2 |
| `/api/affiliate/stats` | GET | Token-gated dashboard data | ⏳ Phase F-2 |
| `/api/affiliate/convert` | POST | Admin commission accrual (`x-admin-secret`) | ⏳ Phase F-2 |

## Pricing single source of truth
BUILD_SPEC §16 table ↔ `Goluq transformation plan/GoLuQ_Pricing_Model.xlsx` ↔ `src/content/affiliateConfig.ts` (Phase F-2). Keep all three in sync.
