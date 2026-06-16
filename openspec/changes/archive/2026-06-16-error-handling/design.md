## Context

The bot uses grammY long polling (`bot.start()`) with no `bot.catch()` handler. When middleware throws—most commonly during `runAgent` → `runModel` when the LLM is unavailable—grammY's default error handler stops the bot and re-throws. The pm2 process may remain running, but polling ceases; @mentions and AI commands go unanswered until a manual restart.

All AI-driven paths (`bot.on('message')` for mentions, `/dota`, `/mid`, `/slap`, `/spit`, `/readycheck`) call `runAgent`, which mutates shared in-memory conversation state before calling external services. There is no try/catch anywhere in the codebase today.

Startup fail-fast for env vars and Turso config (via `bot-storage` spec) is intentional and must remain unchanged.

## Goals / Non-Goals

**Goals:**

- Long polling continues after any handler error.
- LLM and tool failures during `runAgent` return a fallback string instead of throwing.
- Failed agent invocations do not leave partial messages in shared conversation memory.
- Agent loop cannot run indefinitely on malformed model responses.
- Startup failures are logged via explicit `start().catch()` rather than unhandled rejections.

**Non-Goals:**

- LLM retry with exponential backoff.
- Structured logging, metrics, or external alerting.
- Per-command try/catch outside the agent boundary (centralized in `runAgent` + `bot.catch`).
- Changing startup fail-fast behavior for env/DB validation.
- Hardcoded poll-option fallback for `/readycheck` (agent failure returns fallback text; operator can retry command).

## Decisions

### 1. Two-layer error boundary

**Decision:** Layer 1 — `bot.catch()` in `bot.ts` logs errors and does not rethrow. Layer 2 — `runAgent` catches LLM/tool errors internally and returns a fallback string.

**Rationale:** `bot.catch()` alone prevents polling death but users still see silence. Hardening `runAgent` gives user-facing feedback. Together they cover both "bot stays alive" and "user gets a reply."

**Alternative considered:** Only `bot.catch()` — rejected because it does not reply to the user on agent failure.

### 2. Centralize agent resilience in `runAgent`

**Decision:** All error handling for LLM/tool failures lives inside `runAgent` (and helpers it calls). Individual commands keep calling `runAgent` unchanged.

**Rationale:** Every AI path already funnels through one function. One choke point minimizes diff and drift.

**Alternative considered:** `safeRunAgent` wrapper — rejected as unnecessary indirection; behavior belongs in `runAgent` itself.

### 3. Memory rollback via snapshot length

**Decision:** Before adding messages for an invocation, record `memory.length`. On any failure, truncate memory back to that length.

**Rationale:** `runAgent` pushes the user message before the LLM call and may add assistant/tool messages mid-loop. Rollback prevents orphaned or half-finished sequences from polluting subsequent calls.

**Implementation:** Add `getMemoryLength()` and `truncateMemory(length)` to `src/agent/memory.ts`.

### 4. Max agent loop iterations

**Decision:** Cap the `while (true)` loop at 10 iterations; return fallback if exceeded.

**Rationale:** Cheap guard against infinite tool-call loops when the model misbehaves. Separate from LLM unavailability but same resilience class.

### 5. Fallback message constant

**Decision:** Single constant, e.g. `AGENT_FALLBACK_MESSAGE = 'Мозги отключились, попробуй позже'`, in `src/consts.ts` or `src/agent/fallback.ts`.

**Rationale:** One place to edit tone; no error details leaked to chat.

### 6. `bot.catch()` behavior

**Decision:** Log `err.error` and `err.ctx.update.update_id` via `console.error`. Do not rethrow. Optionally distinguish `GrammyError` / `HttpError` in logs only.

**Rationale:** Matches grammY docs; keeps pm2 logs useful without stopping polling.

### 7. Startup: `start().catch(console.error)`

**Decision:** Replace `void start()` with `start().catch((err) => console.error('Failed to start bot:', err))`.

**Rationale:** Init failures (Turso sync, missing config) surface in logs; does not affect runtime resilience but improves operability.

## Risks / Trade-offs

- **[Risk] Fallback on every agent failure may feel repetitive** → Acceptable for a friend-group bot; copy can be tuned later.
- **[Risk] `bot.catch()` swallows errors that should stop the bot (401 invalid token)** → grammY rethrows 401/409 at the polling level regardless; credential errors still fail loudly at the API layer.
- **[Risk] Memory rollback loses context from the failed turn only** → Intended; the failed turn should not persist.
- **[Risk] Telegram `ctx.reply` failure after successful agent response** → Still handled by `bot.catch()`; user may get no reply but bot stays alive. Out of scope for this change.

## Migration Plan

1. Deploy updated code via existing `yarn start:prod` / pm2 restart.
2. No env, DB, or data migration.
3. Rollback: revert commit and restart pm2.

## Open Questions

- None blocking implementation.
