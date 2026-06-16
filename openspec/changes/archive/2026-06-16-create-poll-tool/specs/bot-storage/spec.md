## ADDED Requirements

### Requirement: Polls table schema

The database SHALL store tracked Telegram polls in a `polls` table with columns:

- `id` (integer primary key autoincrement)
- `telegram_poll_id` (text, unique, not null)
- `chat_id` (integer, not null)
- `message_id` (integer, not null)
- `question` (text, not null)
- `poll_type` (text, not null; default `generic`)
- `options_json` (text, not null)
- `completion_rule` (text, not null; `threshold_yes` or `none`)
- `threshold_yes` (integer, nullable)
- `close_on_complete` (integer boolean, not null, default 0)
- `status` (text, not null; `active`, `completed`, or `expired`)
- `created_at` (text, not null)
- `expires_at` (text, not null)
- `completed_at` (text, nullable)

#### Scenario: Poll row persisted on creation

- **WHEN** the `create_poll` tool successfully posts a poll
- **THEN** the bot SHALL insert a row into `polls` with status `active`
- **AND** SHALL set `expires_at` to 24 hours after `created_at`

### Requirement: Poll answers table schema

The database SHALL store poll votes in a `poll_answers` table with columns:

- `poll_id` (integer, foreign key to `polls.id`, not null)
- `telegram_user_id` (integer, not null)
- `option_index` (integer, not null)
- `display_name` (text, not null)
- `updated_at` (text, not null)
- primary key `(poll_id, telegram_user_id)`

#### Scenario: Answer upsert

- **WHEN** a user answers a tracked poll
- **THEN** the bot SHALL insert or replace the row in `poll_answers` for that poll and user

### Requirement: Poll schema in init script

The file `scripts/init-db.sql` SHALL include `CREATE TABLE IF NOT EXISTS` statements for `polls` and `poll_answers` so new databases are created with the full schema.

#### Scenario: Fresh database setup

- **WHEN** an operator applies `scripts/init-db.sql` to a new Turso database
- **THEN** the `polls` and `poll_answers` tables SHALL exist
