-- Wet Kindness bot schema (Turso / libSQL)
--
-- Apply once when setting up a new database:
--   turso db shell <database-name> < scripts/init-db.sql

CREATE TABLE IF NOT EXISTS config (
  code TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tg_name TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  telegram_user_id INTEGER UNIQUE,
  active INTEGER NOT NULL DEFAULT 1,
  plays INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
