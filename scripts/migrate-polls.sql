-- Migration: add poll tracking tables to an existing Turso database.
--
-- Apply once:
--   turso db shell <database-name> < scripts/migrate-polls.sql

CREATE TABLE IF NOT EXISTS polls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_poll_id TEXT NOT NULL UNIQUE,
  chat_id INTEGER NOT NULL,
  message_id INTEGER NOT NULL,
  question TEXT NOT NULL,
  poll_type TEXT NOT NULL DEFAULT 'generic',
  options_json TEXT NOT NULL,
  completion_rule TEXT NOT NULL,
  threshold_yes INTEGER,
  close_on_complete INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS poll_answers (
  poll_id INTEGER NOT NULL REFERENCES polls(id),
  telegram_user_id INTEGER NOT NULL,
  option_index INTEGER NOT NULL,
  display_name TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (poll_id, telegram_user_id)
);
