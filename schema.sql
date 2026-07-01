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
