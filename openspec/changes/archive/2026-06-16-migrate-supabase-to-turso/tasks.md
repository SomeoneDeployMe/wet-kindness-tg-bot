## 1. Dependencies and environment

- [x] 1.1 Add `@libsql/client` to `package.json` dependencies
- [x] 1.2 Remove `@supabase/supabase-js` and `supabase` CLI devDependency from `package.json`
- [x] 1.3 Remove `gen:types` script from `package.json`
- [x] 1.4 Update `.env.template`: add `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, optional `DB_PATH`; remove `SUPABASE_URL`, `SUPABASE_KEY`

## 2. Database module

- [x] 2.1 Create `src/db.ts` with libSQL embedded replica client (`file:` local path, `syncUrl`, `authToken`, `syncInterval`)
- [x] 2.2 Add `initSchema()` with `CREATE TABLE IF NOT EXISTS` for `config` and `members` (columns per design.md)
- [x] 2.3 Add `syncDb()` wrapper that calls `client.sync()` at startup
- [x] 2.4 Add `loadConfig()` returning all rows; validate required codes `SYSTEM`, `MID`, `POLL_OPTIONS`
- [x] 2.5 Add `loadMembers()` returning `id`, `tg_name`, `name`, `telegram_user_id`, `active`, `plays`

## 3. ConfigStore and startup

- [x] 3.1 Extend `src/store.ts` to hold member records (not just `Map<username, name>`); add helper for members where `plays = 1`
- [x] 3.2 Replace `src/supabase.ts` usage in `src/bot.ts` with `src/db.ts`
- [x] 3.3 Update `initPrompts()` (rename if appropriate) to sync, init schema, load config/members into `configStore`
- [x] 3.4 Remove Supabase Realtime subscription
- [x] 3.5 Update `validateEnv()` to require Turso vars and drop Supabase vars
- [x] 3.6 Update `buildPersonalizedMessage()` to use new member structure in `configStore`

## 4. Runtime consumers

- [x] 4.1 Update `src/agent/tools/getRandomChatMember.ts` to read playing members from `configStore`
- [x] 4.2 Update `src/agent/tools/getAllChatMembers.ts` to read playing members from `configStore`
- [x] 4.3 Update `src/commands/readycheck.ts` quorum to count members with `plays = 1`

## 5. Cleanup

- [x] 5.1 Delete `src/supabase.ts`
- [x] 5.2 Delete `src/database.types.ts`
- [x] 5.3 Run `yarn` to update lockfile
- [x] 5.4 Verify TypeScript build (`yarn tsc`) succeeds

## 6. Deploy verification (operator)

- [ ] 6.1 Create Turso database and obtain URL + auth token
- [ ] 6.2 Seed `config` (from Supabase `prompts`) and `members` (from Supabase `users`); set `active` and `plays` per person
- [ ] 6.3 Set Turso env vars on VPS, remove Supabase env vars, restart pm2
- [ ] 6.4 Smoke test: agent reply, `/mid`, `/readycheck` quorum with `plays` subset, `/dota` with member mentions
