## 1. Database schema

- [x] 1.1 Add `polls` and `poll_answers` tables to `scripts/init-db.sql`
- [x] 1.2 Add poll repository functions in `src/db.ts` (or `src/polls/repository.ts`): insert poll, upsert answer, update status, load active polls, expire poll
- [ ] 1.3 Apply schema to Turso production database (manual migration)

## 2. Poll service module

- [x] 2.1 Create `src/polls/constants.ts` — fixed options, 24h TTL, option index constants
- [x] 2.2 Create `src/polls/types.ts` — poll row types, status/completion enums
- [x] 2.3 Create `src/polls/cache.ts` — in-memory `Map` keyed by `telegram_poll_id`
- [x] 2.4 Create `src/polls/service.ts` — `createGenericPoll`, `upsertAnswer`, `evaluateCompletion`, `expirePoll`, `loadActivePollsIntoCache`
- [x] 2.5 Implement startup sweep: expire past-TTL polls and hydrate cache in `bot.ts` init

## 3. poll_answer handler

- [x] 3.1 Create `src/polls/handler.ts` — lookup poll, lazy expiry check, upsert answer, trigger summary/close
- [x] 3.2 Register generic handler in `src/bot.ts` alongside existing readycheck handler (no regression)
- [x] 3.3 Implement summary reply (threaded to poll message) with Да / Может быть sections in informal Russian

## 4. Agent context and create_poll tool

- [x] 4.1 Introduce `AgentContext` type (`chatId`, grammY `Api` or send helpers) in `src/agent/`
- [x] 4.2 Update `runAgent(message, context?)` and pass context through to `runner`
- [x] 4.3 Create `src/agent/tools/createPoll.ts` with zod schema (`question`, optional `threshold_yes`, optional `close_on_complete`)
- [x] 4.4 Wire `create_poll` in `runner.ts` and register tool definition in `agent.ts`
- [x] 4.5 Update all `runAgent` call sites to pass Telegram context where polls should be creatable (`bot.ts` message handler, `dota`, `mid`, `slap`, `spit`, etc.)

## 5. Prompt and verification

- [x] 5.1 Document `SYSTEM` prompt additions for Turso (when to call `create_poll`, parse threshold/close from Russian)
- [x] 5.2 Verify TypeScript build (`yarn tsc`) succeeds
- [ ] 5.3 Manual smoke test: @mention poll with threshold → 3 Да votes → summary reply
- [ ] 5.4 Manual smoke test: poll without threshold → votes tracked, no summary until restart+expiry sweep
- [ ] 5.5 Manual smoke test: `/readycheck` still completes quorum and posts Dota summary
