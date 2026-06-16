## Why

The bot currently depends on Supabase (Postgres + Realtime) to store prompts and chat member display names, but only uses two small tables and a single Realtime subscription for live prompt updates. That is more infrastructure than a single pm2-hosted friend-group bot needs. Turso with an embedded replica on the VPS provides SQLite-compatible storage, managed cloud backups, and fast local reads—without the Supabase overhead.

## What Changes

- Replace `@supabase/supabase-js` with `@libsql/client` using Turso **embedded replica** mode (`file:bot.db` on VPS, synced to Turso Cloud).
- Introduce a `config` table (replaces Supabase `prompts`) for key-value bot configuration including required prompt codes `SYSTEM`, `MID`, and `POLL_OPTIONS`.
- Introduce a `members` table (replaces Supabase `users`) with curated roster fields: display name, Telegram username, Telegram user ID, `active` flag, and `plays` flag for Dota squad / readycheck quorum.
- Load `config` and `members` from Turso at startup into the existing in-memory `configStore`.
- Remove Supabase Realtime subscription; config and member edits take effect after a manual `pm2 restart`.
- Remove Supabase env vars (`SUPABASE_URL`, `SUPABASE_KEY`); add Turso env vars (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, optional `DB_PATH`).
- Remove `src/supabase.ts`, `src/database.types.ts`, and the `gen:types` script.
- Fix agent member tools to read from `configStore` (filtered to playing members) instead of querying the database on every tool call.
- Fix readycheck completion quorum to count only members with `plays = true`, not a hardcoded number.
- **BREAKING**: Deployments must provision a Turso database and seed `config`/`members` data before starting the bot. Existing Supabase data is not migrated by this change (operator handles export separately).

## Capabilities

### New Capabilities

- `bot-storage`: Persistent bot configuration storage via Turso embedded replica—schema for `config` and `members`, startup sync and hydration into `configStore`, and removal of Supabase dependencies.

### Modified Capabilities

<!-- No existing specs in openspec/specs/ -->

## Impact

- **Code**: `src/bot.ts`, `src/store.ts`, new `src/db.ts`, `src/agent/tools/getRandomChatMember.ts`, `src/agent/tools/getAllChatMembers.ts`, `src/commands/readycheck.ts`; delete `src/supabase.ts`, `src/database.types.ts`.
- **Dependencies**: Remove `@supabase/supabase-js`, `supabase` CLI; add `@libsql/client`.
- **Environment**: `.env.template` updated; production VPS needs Turso credentials and a local replica file path.
- **Operations**: Create Turso database, seed data, deploy; reload config by restarting the bot (no live prompt push).
- **Out of scope**: Telegram-observed `members` metadata table, `member_facts` table, Supabase data export tooling, AGENTS.md update, removal of unused `lowdb` dependency.
