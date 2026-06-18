## 1. Tavily client

- [x] 1.1 Add `@tavily/core` dependency (`yarn add @tavily/core`)
- [x] 1.2 Add `src/tavily/types.ts` with agent-facing result/error types and error code enum
- [x] 1.3 Add `src/tavily/client.ts`: wrap `tavily({ apiKey }).search()` with `searchDepth: 'basic'`, `maxResults: 5`, `autoParameters: false`, 10s timeout
- [x] 1.4 Classify SDK errors: `CREDITS_EXHAUSTED` (429 + credit/quota/usage message), `RATE_LIMITED`, `SEARCH_AUTH_ERROR`, `SEARCH_UNAVAILABLE`
- [x] 1.5 Log warnings/errors with status and message; never throw on expected Tavily failures

## 2. Agent tool

- [x] 2.1 Add `src/agent/tools/webSearch.ts` with zod `query` param and tool definition
- [x] 2.2 Format successful responses as compact JSON for the model; truncate long `content` fields
- [x] 2.3 Wire `web_search` in `runner.ts` and register in `AGENT_TOOLS` in `agent.ts`

## 3. Per-run search limit

- [x] 3.1 Track `searchCallsThisRun` in `runAgent` (reset at start of each invocation)
- [x] 3.2 Before calling Tavily, if counter ≥ 2 return `SEARCH_LIMIT_REACHED:` without HTTP call; otherwise increment and proceed

## 4. Configuration

- [x] 4.1 Add `TAVILY_API_KEY` to `validateEnv()` in `src/bot.ts`
- [x] 4.2 Add `TAVILY_API_KEY` placeholder to `.env.template` (if present in repo)

## 5. SYSTEM prompt and deploy notes

- [x] 5.1 Add `system-prompt-additions.md` with web_search block (including credit-exhaustion and limit behavior)
- [ ] 5.2 Operator: append block to `SYSTEM` row in Turso and restart bot after deploy
