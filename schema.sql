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
  created_at TEXT NOT NULL
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
