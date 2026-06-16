## Context

The bot on `develop` uses Supabase for two tables (`prompts`, `users`) and a Realtime subscription that pushes prompt updates into `configStore`. Agent tools query Supabase directly on every invocation, bypassing the cache. The bot runs as a single pm2 process on a VPS; configuration changes are infrequent; data volume is tiny (three prompt rows, ~6 members).

Telegram Bot API cannot list all chat members on demand, so a curated `members` table remains necessary regardless of storage backend.

## Goals / Non-Goals

**Goals:**

- Replace Supabase with Turso embedded replica (`file:bot.db` on VPS + Turso Cloud sync).
- Store bot configuration in a `config` key-value table (includes required prompt codes `SYSTEM`, `MID`, `POLL_OPTIONS`; room for other config keys later).
- Store curated squad roster in a `members` table with display names, Telegram identifiers, roster flags, and Dota player flag.
- Load all config and members into `configStore` at startup; runtime reads use the cache.
- Readycheck quorum and agent member tools use only members with `plays = true`.
- Enable managed cloud backups and VPS disk failure recovery via Turso.
- Remove Supabase dependencies, env vars, and Realtime subscription.

**Non-Goals:**

- Automatic/live config reload (manual `pm2 restart` is acceptable).
- Supabase data export or seed scripts (operator handles separately).
- Separate table for Telegram-observed member metadata or conversation facts (`member_facts`) — follow-up change.
- AGENTS.md update or removal of unused `lowdb` dependency.
- Changes to AI memory, poll state, or dota timer (remain in-memory).

## Decisions

### 1. Turso embedded replica over local-only SQLite

**Choice:** `@libsql/client` with `url: file:bot.db`, `syncUrl: TURSO_DATABASE_URL`, `authToken: TURSO_AUTH_TOKEN`, `syncInterval: 60`.

**Rationale:** VPS-hosted bot benefits from Turso Cloud backups and recovery if the VPS is lost. Embedded replica keeps startup reads local and fast.

### 2. Manual restart for config reload

**Choice:** Drop Supabase Realtime; reload config and members only on process restart after `client.sync()`.

**Rationale:** Config and roster change rarely; operator already manages pm2.

### 3. Thin `src/db.ts` module

**Choice:** Single module exporting a libSQL client and small query helpers (`loadConfig()`, `loadMembers()`, `initSchema()`).

**Rationale:** Matches the small bot style; avoids ORM overhead for two tables.

### 4. configStore remains the runtime cache

**Choice:** Startup: `sync()` → SQL SELECT → populate `configStore`. All runtime consumers read from `configStore`, not Turso.

**Rationale:** Same pattern as today minus Realtime; fixes agent tools hitting DB on every call.

### 5. Schema: `config` and `members` tables

**Choice:**

```sql
CREATE TABLE IF NOT EXISTS config (
  code        TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS members (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  tg_name           TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  telegram_user_id  INTEGER UNIQUE,
  active            INTEGER NOT NULL DEFAULT 1,
  plays             INTEGER NOT NULL DEFAULT 1,
  created_at        TEXT DEFAULT (datetime('now'))
);
```

**Column semantics:**

| Table / column | Purpose |
|----------------|---------|
| `config.code` | Primary key; required codes `SYSTEM`, `MID`, `POLL_OPTIONS`; other keys allowed for future config |
| `config.value` | Unconstrained TEXT |
| `config.updated_at` | Audit timestamp when operator edits a row |
| `members.tg_name` | Telegram username without `@`; lookup key for message personalization |
| `members.name` | Friendly display name for AI context |
| `members.telegram_user_id` | Stable Telegram user ID; nullable until populated |
| `members.active` | `1` = on curated roster; `0` = left group but row kept for history |
| `members.plays` | `1` = actively plays Dota; only these count for readycheck quorum and agent member tools |

**Rationale:** Renaming `prompts` → `config` leaves room for non-prompt keys. Renaming `users` → `members` reflects curated squad roster. `plays` separates Dota-active subset from general roster (`active`).

**Supabase migration mapping:**

| Supabase | Turso |
|----------|-------|
| `prompts` | `config` |
| `users` | `members` (seed with `active = 1`, `plays = 1`; adjust per person) |

### 6. Required config codes unchanged

**Choice:** Startup validates presence of `SYSTEM`, `MID`, and `POLL_OPTIONS` in `config`. Other `config.code` rows are loaded but not required.

**Rationale:** Preserves current bot behavior; `PromptType` union in code stays for these three.

### 7. Readycheck quorum and agent tools

**Choice:** Quorum = count of members where `plays = 1`. Agent member tools (`get_random_chat_member`, `get_the_names_of_all_chat_member`) use the same `plays = 1` filter.

**Rationale:** Not everyone on the roster actively plays; lurkers or inactive friends stay in `members` but don't block readycheck.

### 8. Schema initialization at startup

**Choice:** Run `CREATE TABLE IF NOT EXISTS` on first connect.

**Rationale:** Keeps ops simple for a two-table schema.

### 9. Environment variables

| Variable | Purpose |
|----------|---------|
| `TURSO_DATABASE_URL` | Turso Cloud libSQL URL (sync target) |
| `TURSO_AUTH_TOKEN` | Turso auth token |
| `DB_PATH` | Optional local replica path (default `bot.db`) |

Remove: `SUPABASE_URL`, `SUPABASE_KEY`.

## Architecture

```
Turso Cloud (source of truth, backups)
        ↕ sync
VPS: file:bot.db (embedded replica)
        ↓ startup SELECT
   configStore (config map + members list)
        ↓
   bot.ts, llm.ts, commands, agent tools
```

**Startup sequence:**

1. Validate env (including Turso vars).
2. Create libSQL client with embedded replica config.
3. `await client.sync()`.
4. `initSchema()` if needed.
5. Load `config` and `members` → `configStore` (throw if required config codes or no members missing).
6. `bot.start()`.

**configStore shape (implementation detail):**

- Prompts/config: `Map<PromptType, string>` for the three required codes (unchanged API for commands/LLM).
- Members: structured list or map supporting `tg_name`, `name`, `telegram_user_id`, `active`, `plays`; expose helper for playing members (quorum + tools).

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Turso outage at startup | Embedded replica local file may serve reads; document that first deploy needs successful sync |
| Operator sets wrong `plays` flags | Readycheck never completes or completes too early; document seed values |
| `telegram_user_id` null for seeded rows | Acceptable in v1; populate later when bot observes users |
| Native `@libsql/client` build on VPS | Verify on deploy |

## Migration Plan

1. Create Turso database (CLI or dashboard).
2. Operator exports Supabase `prompts` → `config`, `users` → `members`; set `active`/`plays` per person.
3. Deploy code with Turso env vars; remove Supabase env vars.
4. Verify bot starts, agent responds, readycheck quorum matches `plays` count.
5. Decommission Supabase when satisfied.

**Rollback:** Revert to previous commit, restore Supabase env vars, restart pm2.

## Open Questions

- None blocking implementation. Dev/prod Turso database separation left to operator.

## Follow-up (separate change)

- Telegram-observed member metadata table (auto-upsert from `chat_member` / messages).
- `member_facts` table for conversation-derived facts.
