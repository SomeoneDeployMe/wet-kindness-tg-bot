## Why

When the LLM or a tool call fails (model unavailable, timeout, network error), the bot stops responding to @mentions and other AI-driven commands until a manual `pm2 restart`. Without a grammY error handler, long polling stops after the first unhandled middleware error—the process may stay alive but no longer fetches updates. The bot must survive transient external failures and keep answering (or at least reply with a fallback) instead of going silent.

## What Changes

- Add a global `bot.catch()` handler so long polling continues after handler errors.
- Harden `runAgent` so LLM and tool failures are caught internally and return a user-facing fallback message instead of throwing.
- Roll back agent conversation memory added during a failed invocation so partial tool-call sequences do not poison shared state.
- Add a max-iteration guard on the agent loop to prevent infinite loops when the model misbehaves.
- Fix startup error handling: `start()` rejections logged cleanly instead of silent unhandled rejections.
- Define a single Russian fallback message constant for agent failures (informal bot tone).

## Capabilities

### New Capabilities

- `bot-reliability`: Resilience to external failures—grammY error handling, agent error boundaries, memory rollback on failure, and user-facing fallback replies when the LLM or tools are unavailable.

### Modified Capabilities

<!-- No existing spec requirements change; bot-storage startup fail-fast behavior is preserved -->

## Impact

- **Code**: `src/bot.ts`, `src/agent/agent.ts`, `src/agent/memory.ts` (rollback helper), possibly a small `src/agent/fallback.ts` or constant in `consts.ts`.
- **Dependencies**: None.
- **Operations**: No deploy or env changes; bot recovers automatically from LLM outages without restart.
- **Out of scope**: LLM retry/backoff, structured logging or alerting, per-command try/catch outside the agent path, changes to startup fail-fast for env/DB validation.
