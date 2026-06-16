## Why

Users often ask the bot in natural language to create ad-hoc group polls (e.g. "create a poll who wants hookah today, 3 people is enough"). Today the bot can only create polls via `/readycheck`, with hardcoded Dota semantics and in-memory tracking. The agent has no side-effect tools and cannot post or track generic polls from @mentions or other AI-driven commands.

## What Changes

- Add a `create_poll` agent tool that posts non-anonymous Telegram polls with fixed options: **Да**, **Нет**, **Может быть**.
- Persist active polls and answers in Turso (`polls`, `poll_answers` tables) so tracking survives restarts.
- Add a unified `poll_answer` handler: upsert votes, evaluate completion rules, post summary when threshold is met.
- Thread Telegram context (`chatId`, `messageId`, API) through `runAgent` so any caller can trigger poll creation.
- Expire stale polls after **24 hours** with silent cleanup (`stopPoll`, no chat message).
- When no `threshold_yes` is specified, track votes silently until expiry (no auto-summary).
- Allow multiple concurrent active polls per chat.
- Optionally close poll via `stopPoll` when user requested it and threshold is met.

## Capabilities

### New Capabilities

- `bot-polls`: Generic agent-created polls with fixed yes/no/maybe options, DB-backed answer tracking, threshold-based completion summaries, 24h TTL expiry, and silent cleanup.

### Modified Capabilities

- `bot-storage`: Add `polls` and `poll_answers` table schemas; load active polls at startup into an in-memory cache.

## Impact

- **Code**: `src/agent/agent.ts`, `src/agent/tools/` (new `createPoll.ts`, update `runner.ts`), new `src/polls/` module (service + handler), `src/db.ts`, `src/bot.ts`, all `runAgent` call sites (`bot.ts`, commands).
- **Database**: New tables in `scripts/init-db.sql`; migration applied to Turso.
- **Prompts**: Update `SYSTEM` config to teach when/how to call `create_poll` and parse threshold/close intent from Russian.
- **Out of scope**: Migrating `/readycheck` onto the new poll engine (future change); poll creation outside `runAgent`; anonymous polls; custom option lists.
