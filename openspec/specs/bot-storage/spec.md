# bot-storage

## Purpose

Persistent bot configuration and curated member roster via Turso embedded replica (`config` and `members` tables), hydrated into in-memory `configStore` at startup.

## Requirements

### Requirement: Turso embedded replica database

The bot SHALL persist configuration in a Turso database using embedded replica mode: a local SQLite-compatible file on the VPS synced to Turso Cloud as the source of truth.

#### Scenario: Client initialization

- **WHEN** the bot process starts
- **THEN** it SHALL create a libSQL client with a local file URL, Turso sync URL, and auth token from environment variables

#### Scenario: Startup sync

- **WHEN** the bot initializes the database connection
- **THEN** it SHALL sync the local replica from Turso Cloud before loading configuration

### Requirement: Config table schema and storage

The database SHALL store bot configuration in a `config` table with columns `code` (primary key), `value` (unconstrained text), `created_at`, and `updated_at`. Required config codes are `SYSTEM`, `MID`, `POLL_OPTIONS`, and `ICEBREAKER`.

#### Scenario: Required config codes present at startup

- **WHEN** the bot starts and queries the `config` table
- **THEN** it SHALL find rows for `SYSTEM`, `MID`, `POLL_OPTIONS`, and `ICEBREAKER`
- **AND** SHALL fail startup with a clear error if any required code is missing

#### Scenario: Additional config keys allowed

- **WHEN** the `config` table contains rows with codes other than `SYSTEM`, `MID`, `POLL_OPTIONS`, or `ICEBREAKER`
- **THEN** the bot MAY load them into `configStore` without requiring them at startup

### Requirement: Members table schema and storage

The database SHALL store curated chat member roster in a `members` table with columns:

- `id` (integer primary key)
- `tg_name` (Telegram username, unique, without `@`)
- `name` (friendly display name for AI context)
- `telegram_user_id` (integer, unique, nullable)
- `active` (integer boolean; `1` = on roster, `0` = left but row retained)
- `plays` (integer boolean; `1` = actively plays Dota)
- `created_at`

#### Scenario: Members loaded at startup

- **WHEN** the bot starts and queries the `members` table
- **THEN** it SHALL load all rows into the in-memory `configStore`
- **AND** SHALL fail startup with a clear error if no members are found

### Requirement: ConfigStore hydration at startup

The bot SHALL hydrate the in-memory `configStore` from Turso at startup. Runtime reads of config and members SHALL use `configStore`, not direct database queries.

#### Scenario: System prompt for LLM

- **WHEN** the agent calls the language model
- **THEN** it SHALL use the `SYSTEM` config value from `configStore`

#### Scenario: Message personalization

- **WHEN** a user sends a message to the AI and their Telegram username exists in `configStore` members
- **THEN** the bot SHALL prefix the message with the friendly `name` for that member

### Requirement: Icebreaker prompt for initiative

The bot SHALL load the `ICEBREAKER` config code into `configStore` at startup and SHALL expose it via `PromptType` for use by the initiative icebreaker flow.

#### Scenario: Icebreaker prompt loaded

- **WHEN** the bot starts and finds an `ICEBREAKER` row in the `config` table
- **THEN** it SHALL store the value in `configStore`
- **AND** SHALL make it available via `getPromptByType('ICEBREAKER')`

#### Scenario: Icebreaker prompt missing

- **WHEN** the bot starts and the `ICEBREAKER` row is absent from the `config` table
- **THEN** the bot SHALL fail startup with a clear error

### Requirement: Manual configuration reload

Configuration and member changes in Turso SHALL take effect only after the bot process is restarted. The bot SHALL NOT subscribe to live database change notifications.

#### Scenario: Config edit without restart

- **WHEN** an operator updates a row in the `config` table
- **AND** the bot process has not been restarted
- **THEN** the bot SHALL continue using the previously loaded value from `configStore`

#### Scenario: Config edit after restart

- **WHEN** an operator updates a row in the `config` table
- **AND** the bot process is restarted
- **THEN** the bot SHALL sync and load the updated value into `configStore`

### Requirement: Agent member tools use playing members from cache

Agent tools that return chat member names SHALL read from `configStore` members where `plays = 1` and SHALL NOT query the database directly on each invocation.

#### Scenario: Random member tool

- **WHEN** the agent invokes the random chat member tool
- **THEN** the tool SHALL return an `@`-prefixed Telegram username chosen from members with `plays = 1`

#### Scenario: All members tool

- **WHEN** the agent invokes the all chat members tool
- **THEN** the tool SHALL return a comma-separated list of `@`-prefixed usernames for members with `plays = 1`

### Requirement: Readycheck quorum from playing members

Readycheck poll completion SHALL trigger when the number of poll answers equals the count of members in `configStore` with `plays = 1`, not a hardcoded count.

#### Scenario: All playing members answered poll

- **WHEN** every member with `plays = 1` has answered the active readycheck poll
- **THEN** the bot SHALL post the poll results summary

#### Scenario: Non-playing members do not affect quorum

- **WHEN** a member with `plays = 0` has not answered the readycheck poll
- **AND** all members with `plays = 1` have answered
- **THEN** the bot SHALL post the poll results summary

### Requirement: No Supabase dependency

The bot SHALL NOT depend on Supabase client libraries, environment variables, or Realtime subscriptions after this change.

#### Scenario: Required environment variables

- **WHEN** the bot validates environment at startup
- **THEN** it SHALL require `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`
- **AND** SHALL NOT require `SUPABASE_URL` or `SUPABASE_KEY`

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
