## Why

The agent has no reliable notion of "today." The `SYSTEM` prompt lives in Turso and is loaded once at startup, so it cannot embed a live calendar date. That leads to stale answers on time-sensitive questions (schedules, news, "this week") and weak grounding even when `web_search` returns recent results.

## What Changes

- Inject the current date into the LLM system message at **call time** in code (Turso `SYSTEM` text stays static).
- Use **Europe/Moscow** calendar date, consistent with existing initiative time logic.
- Apply on every `runModel` invocation so all agent flows (@mention, `/mid`, icebreaker, readycheck poll options, etc.) share the same date context.
- No Turso schema or operator prompt migration required for v1 (optional placeholder support documented in design as alternative).

## Capabilities

### New Capabilities

<!-- none — behavior change to existing agent/storage contract -->

### Modified Capabilities

- `bot-storage`: Clarify that the static `SYSTEM` config value is combined with a runtime-generated current-date line when calling the LLM.

## Impact

- **Code**: `src/agent/llm.ts` (system message assembly); possible small date helper in `src/utils/` or `src/initiative/time.ts`
- **Config**: Turso `SYSTEM` row unchanged for v1
- **Out of scope**: Per-user timezones, live clock in every user message, changing MID/ICEBREAKER/POLL_OPTIONS prompts in DB
