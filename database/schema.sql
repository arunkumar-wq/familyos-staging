-- FamilyOS Database Schema
-- SQLite with better-sqlite3

PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- ─── FAMILIES ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS families (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  plan        TEXT NOT NULL DEFAULT 'pro', -- free | pro | family
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── USERS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  family_id     TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  phone         TEXT,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'member', -- admin | co-admin | member | advisor | view-only
  relation      TEXT,                           -- self | spouse | son | daughter | father | mother | other
  date_of_birth TEXT,
  avatar_color  TEXT DEFAULT '#0f1f3d',
  avatar_url    TEXT DEFAULT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT 1,
  last_login    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── USER PERMISSIONS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS permissions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vault       TEXT NOT NULL DEFAULT 'own',       -- full | view | own | none
  portfolio   TEXT NOT NULL DEFAULT 'none',      -- full | view | none
  insights    TEXT NOT NULL DEFAULT 'none',      -- full | view | none
  family_mgmt TEXT NOT NULL DEFAULT 'none',      -- admin | co-admin | none
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── DOCUMENTS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id           TEXT PRIMARY KEY,
  family_id    TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  owner_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  original_name TEXT,
  category     TEXT NOT NULL,  -- identity | finance | property | insurance | legal | education | medical | tax | other
  file_path    TEXT,
  file_size    TEXT,
  mime_type    TEXT,
  status       TEXT NOT NULL DEFAULT 'current', -- current | expiring | expired | review
  expiry_date  TEXT,
  issued_by    TEXT,
  issue_date   TEXT,
  notes        TEXT,
  ai_analyzed  BOOLEAN DEFAULT 0,
  ai_summary   TEXT,    -- JSON string
  tags         TEXT,    -- comma-separated
  is_deleted   BOOLEAN DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── ASSETS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assets (
  id          TEXT PRIMARY KEY,
  family_id   TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  subtitle    TEXT,
  category    TEXT NOT NULL,  -- real-estate | equities | fixed-income | cash | gold | crypto | other
  value       REAL NOT NULL DEFAULT 0,
  currency    TEXT NOT NULL DEFAULT 'INR',
  institution TEXT,
  account_no  TEXT,
  notes       TEXT,
  is_seed     INTEGER DEFAULT 0,
  last_updated TEXT NOT NULL DEFAULT (datetime('now')),
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── LIABILITIES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS liabilities (
  id           TEXT PRIMARY KEY,
  family_id    TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  subtitle     TEXT,
  category     TEXT NOT NULL,  -- mortgage | auto | personal | education | credit-card | other
  balance      REAL NOT NULL DEFAULT 0,
  interest_rate REAL,
  emi          REAL,
  currency     TEXT NOT NULL DEFAULT 'INR',
  institution  TEXT,
  due_date     TEXT,
  notes        TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── NET WORTH SNAPSHOTS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS net_worth_snapshots (
  id          TEXT PRIMARY KEY,
  family_id   TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  total_assets    REAL NOT NULL DEFAULT 0,
  total_liabilities REAL NOT NULL DEFAULT 0,
  net_worth   REAL NOT NULL DEFAULT 0,
  snapshot_date TEXT NOT NULL DEFAULT (date('now')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── ALERTS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id          TEXT PRIMARY KEY,
  family_id   TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  type        TEXT NOT NULL,     -- urgent | warning | info | success
  icon        TEXT,
  title       TEXT NOT NULL,
  description TEXT,
  is_read     BOOLEAN DEFAULT 0,
  is_dismissed BOOLEAN DEFAULT 0,
  link_page   TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── TASKS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id          TEXT PRIMARY KEY,
  family_id   TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  due_date    TEXT,
  is_urgent   BOOLEAN DEFAULT 0,
  is_done     BOOLEAN DEFAULT 0,
  priority    INTEGER DEFAULT 5,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── AUDIT LOG ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          TEXT PRIMARY KEY,
  family_id   TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  meta        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── INDEXES ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_family ON users(family_id);
CREATE INDEX IF NOT EXISTS idx_documents_family ON documents(family_id);
CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_assets_family ON assets(family_id);
CREATE INDEX IF NOT EXISTS idx_liabilities_family ON liabilities(family_id);
CREATE INDEX IF NOT EXISTS idx_alerts_family ON alerts(family_id);
CREATE INDEX IF NOT EXISTS idx_tasks_family ON tasks(family_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_family ON net_worth_snapshots(family_id);
