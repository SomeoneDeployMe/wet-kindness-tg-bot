## 1. Constants and memory helpers

- [x] 1.1 Add `AGENT_FALLBACK_MESSAGE` constant (Russian, informal tone) in `src/consts.ts` or `src/agent/fallback.ts`
- [x] 1.2 Add `getMemoryLength()` and `truncateMemory(length)` to `src/agent/memory.ts`

## 2. Agent resilience

- [x] 2.1 Refactor `runAgent` in `src/agent/agent.ts`: snapshot memory length before invocation
- [x] 2.2 Wrap agent loop body in try/catch; on error truncate memory to snapshot and return fallback message
- [x] 2.3 Add max iteration limit (10) to agent loop; on exceed truncate memory and return fallback message
- [x] 2.4 Wrap `runModel` response access defensively (empty `choices` returns fallback, not throw)

## 3. Bot-level error handling

- [x] 3.1 Register `bot.catch()` in `src/bot.ts` before `bot.start()` — log error and update id, do not rethrow
- [x] 3.2 Replace `void start()` with `start().catch(...)` for startup failure logging

## 4. Verification

- [x] 4.1 Verify TypeScript build (`yarn tsc`) succeeds
- [ ] 4.2 Manual smoke test: simulate LLM failure (bad API key or unreachable URL), confirm bot still responds to next mention with fallback and without restart
