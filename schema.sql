-- GoLuQ D1 schema (BUILD_SPEC §10 + §10A). One database holds leads + affiliate data.
-- Apply: npx wrangler d1 execute goluq-leads --file=./schema.sql --remote

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  message TEXT,
  role TEXT,
  industry TEXT,
  cross_sell TEXT,
  wants_training INTEGER DEFAULT 0,
  ref_code TEXT,                       -- affiliate attribution (last-click within window)
  created_at TEXT NOT NULL,
  -- Soft follow-up engine (days 3/5/7/12; stops on opt-out)
  followup_stage INTEGER DEFAULT 0,    -- 0..4 (which follow-up is next)
  next_followup_at TEXT,               -- datetime the next follow-up is due (null = done)
  opted_out INTEGER DEFAULT 0,         -- 1 = customer asked to stop / not interested
  last_inbound_at TEXT,                -- last time the customer replied
  status TEXT DEFAULT 'new'            -- new | engaged | opted_out | converted | done
);
-- If upgrading an existing DB, run these once (ignore "duplicate column" errors):
--   ALTER TABLE leads ADD COLUMN followup_stage INTEGER DEFAULT 0;
--   ALTER TABLE leads ADD COLUMN next_followup_at TEXT;
--   ALTER TABLE leads ADD COLUMN opted_out INTEGER DEFAULT 0;
--   ALTER TABLE leads ADD COLUMN last_inbound_at TEXT;
--   ALTER TABLE leads ADD COLUMN status TEXT DEFAULT 'new';
CREATE INDEX IF NOT EXISTS idx_leads_followup ON leads(next_followup_at);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);

-- First-party visitor analytics. DELIBERATELY carries no PII: no IP, no cookie,
-- no cross-site identifier. `session_id` is a random value held in sessionStorage
-- that dies with the tab — enough to stitch a journey into a lead, not enough to
-- identify a person. This is what keeps the site defensible under DPDP Act 2023
-- without gating analytics behind a consent banner.
CREATE TABLE IF NOT EXISTS visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  path TEXT NOT NULL,
  referrer_host TEXT,                  -- host only, never the full URL
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  ref_code TEXT,                       -- affiliate attribution, if any
  device TEXT,                         -- mobile | tablet | desktop
  country TEXT,                        -- from the edge/proxy header when present
  lang TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_visits_session ON visits(session_id);
CREATE INDEX IF NOT EXISTS idx_visits_created ON visits(created_at);

-- Catalogue pricing, editable from the cockpit. src/content/catalogue.ts holds
-- the seed defaults and stays the fallback if the API is unreachable — but once
-- a row exists here, THIS is the source of truth for the site AND for the prices
-- the conversational guide quotes. That kills the old drift problem where a
-- price change had to be made in three places and shipped.
CREATE TABLE IF NOT EXISTS pricing (
  id TEXT PRIMARY KEY,                 -- matches TierId in catalogue.ts
  price_inr INTEGER NOT NULL,
  recurring INTEGER DEFAULT 0,
  lead_time TEXT,
  enabled INTEGER DEFAULT 1,           -- 0 hides the tier from the site entirely
  offer_label TEXT,                    -- e.g. "Launch offer — this month only"
  offer_price_inr INTEGER,             -- optional promotional price
  sort_order INTEGER DEFAULT 0,
  updated_at TEXT
);

-- Live visitor conversations. The guide's replies are persisted so the owner can
-- read what was said before taking over, and so a handoff has context.
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,                 -- the sessionStorage session id from lib/track.ts
  created_at TEXT NOT NULL,
  last_at TEXT NOT NULL,
  needs_human INTEGER DEFAULT 0,       -- visitor asked for a person
  agent_joined INTEGER DEFAULT 0,      -- owner has replied at least once
  closed INTEGER DEFAULT 0,
  unread_for_agent INTEGER DEFAULT 0,
  visitor_name TEXT,
  visitor_phone TEXT,
  page TEXT,
  lang TEXT
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,                  -- visitor | guide | agent
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chatmsg_session ON chat_messages(session_id, id);
CREATE INDEX IF NOT EXISTS idx_chatsess_last ON chat_sessions(last_at);

-- Owner login for the cockpit. Single row (id = 1) — this is a one-owner tool,
-- not a multi-user product. `pass_hash` is PBKDF2-SHA256 (see functions/lib/auth.ts);
-- `setup_token` backs the one-time "choose your password" link.
CREATE TABLE IF NOT EXISTS admin_auth (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  username TEXT,
  pass_hash TEXT,
  setup_token TEXT,
  setup_expires TEXT,
  updated_at TEXT
);

-- Opaque server-side sessions, so a token can be revoked and carries no data.
CREATE TABLE IF NOT EXISTS admin_sessions (
  token TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_adminsess_exp ON admin_sessions(expires_at);

-- Runtime-editable admin settings (owner_whatsapp, followups_enabled, …)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS affiliates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,           -- short share code, e.g. RAVI4K9
  token TEXT UNIQUE NOT NULL,          -- secret dashboard key (32+ hex)
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  city TEXT,
  pan TEXT NOT NULL,
  upi_id TEXT NOT NULL,
  youtube_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ref_hits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL,                  -- no PII stored: code + time only
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  affiliate_code TEXT NOT NULL,
  lead_id INTEGER,                     -- nullable link back to the originating lead
  customer_ref TEXT,                   -- internal customer id once converted
  period_month TEXT,                   -- 'YYYY-MM' the commission is for
  rate REAL NOT NULL,                  -- 0.35 or 0.12 (snapshot at accrual)
  amount_inr REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | paid
  created_at TEXT NOT NULL,
  paid_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_hits_code ON ref_hits(code);
CREATE INDEX IF NOT EXISTS idx_comm_code ON commissions(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_leads_ref ON leads(ref_code);
