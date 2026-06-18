## Context

The bot's agent (`runAgent`) already supports tools: chat-member lookup, `create_poll`, `close_poll`. Users trigger the agent via @mention, reply, or `свист`. There is no way to fetch fresh external facts (pro Dota schedules, patch notes, news). Prior exploration ruled out Stratz (Steam OAuth), Liquipedia LPDB (email token), and OpenDota alone (no upcoming fixtures). Tavily Search API provides LLM-ready web snippets with a free tier (1,000 credits/month, 1 credit per basic search).

## Goals / Non-Goals

**Goals:**

- Add `web_search` agent tool calling Tavily Search (`search_depth: basic`, `max_results: 5`).
- Hard cap of **2** searches per `runAgent` invocation (enforced in code).
- Graceful degradation when Tavily fails—especially monthly credit exhaustion—without crashing the agent loop.
- Return structured error strings to the model so it can reply honestly in Russian.
- Require `TAVILY_API_KEY` at startup.

**Non-Goals:**

- Tavily Extract, Crawl, Map, or Research endpoints.
- Retries with backoff for rate limits (429 RPM)—single attempt is enough for v1; model gets a clear message.
- Proactive push notifications about matches.
- OpenDota or Liquipedia direct integrations.
- Usage monitoring dashboard or billing alerts.

## Decisions

### 1. Tavily client: `@tavily/core` SDK

**Decision:** Add dependency `@tavily/core` and wrap it in a thin `src/tavily/client.ts`:

```ts
import {tavily} from '@tavily/core';

const client = tavily({apiKey: process.env.TAVILY_API_KEY!});

await client.search(query, {
  searchDepth: 'basic', // explicit — avoids auto upgrade to advanced (2 credits)
  maxResults: 5,
  autoParameters: false,
});
```

**Rationale:** Official SDK with TypeScript types, stays aligned with API changes, and documents options like `searchDepth` / `autoParameters` that affect credit cost. Our wrapper still owns error classification and agent-facing message prefixes.

**Alternative considered:** Raw `fetch` to `/search` — rejected; more boilerplate, manual types, and easier to miss credit-cost options.

### 2. Module layout

**Decision:**

```
src/tavily/
  client.ts    — wraps @tavily/core search(), maps SDK/HTTP errors to typed outcomes
  types.ts     — agent-facing result/error types and error code enum
src/agent/tools/
  webSearch.ts — zod params, tool definition, calls client, formats JSON for model
```

**Rationale:** Keeps Tavily HTTP logic testable and separate from agent wiring.

### 3. Per-run search budget

**Decision:** `runAgent` maintains a `searchCallsThisRun` counter (reset at the start of each call). Before executing `web_search`, if counter ≥ 2, skip the HTTP call and return:

```
SEARCH_LIMIT_REACHED: Maximum 2 web searches per message. Answer from existing context or say you cannot search further.
```

Otherwise increment counter and call the tool handler.

**Rationale:** Prompt alone is not reliable; hard cap prevents credit burn and runaway loops.

### 4. Tavily error classification

**Decision:** `client.search` returns a discriminated result. Catch SDK thrown errors and inspect `status` / `message` when available; fall back to parsing error message text:

| Condition | Code | Tool message prefix |
|-----------|------|---------------------|
| HTTP 429 + message mentions credits/quota/usage | `CREDITS_EXHAUSTED` | `CREDITS_EXHAUSTED:` |
| HTTP 429 (other, e.g. RPM) | `RATE_LIMITED` | `RATE_LIMITED:` |
| HTTP 401 / 403 | `AUTH_ERROR` | `SEARCH_AUTH_ERROR:` |
| HTTP 5xx, network timeout, malformed response | `UNAVAILABLE` | `SEARCH_UNAVAILABLE:` |
| Success | `OK` | JSON payload with `results[]` |

**Credit exhaustion detection:** Treat 429 as `CREDITS_EXHAUSTED` when the error message contains substrings like `credit`, `quota`, or `usage` (case-insensitive). Do **not** treat bare `limit` alone as credit exhaustion (RPM limits also mention limits). Otherwise classify as `RATE_LIMITED`. Log status and message at `warn` level for operator debugging.

**Rationale:** The model needs unambiguous prefixes to tell users "поиск временно недоступен, лимит Tavily кончился" vs a generic failure. No silent fallback to hallucination.

### 5. Tool response shape (success)

**Decision:** Return compact JSON string to the model:

```json
{
  "query": "...",
  "results": [
    { "title": "...", "url": "...", "content": "..." }
  ]
}
```

Truncate each `content` to ~500 chars if longer (Tavily snippets are already short).

**Rationale:** Structured data reduces fabrication; keeps tool messages within context limits.

### 6. Agent failure vs tool failure

**Decision:** Tavily errors do **not** trigger `AGENT_FALLBACK_MESSAGE` or memory truncation. Only unexpected exceptions in `webSearch` handler (bugs) log at `error` and return `SEARCH_UNAVAILABLE: internal error`.

**Rationale:** Credit exhaustion is an expected operational state, not an agent crash.

### 7. Environment and timeout

**Decision:**

- `TAVILY_API_KEY` required in `validateEnv()` alongside existing vars (passed explicitly to `tavily({ apiKey })`, not keyless mode).
- Request timeout: **10 seconds** via `Promise.race` around `client.search()` (SDK has no dedicated timeout option in v1).

Add placeholder to `.env.template` if the file exists (gitignored `.env` unchanged).

### 8. SYSTEM prompt

**Decision:** Document append block in `system-prompt-additions.md` (same pattern as `create_poll`). Operator merges into Turso `SYSTEM` row manually; not loaded from DB automatically.

Content covers: when to search, when not to, English queries, MSK times, honesty about sources, and explicit instruction to tell the user search is temporarily unavailable when tool returns `CREDITS_EXHAUSTED` or `SEARCH_LIMIT_REACHED`.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Model searches too often | Hard 2-call cap + SYSTEM prompt |
| Credit exhaustion mid-month | Clear user-facing Russian message; log `CREDITS_EXHAUSTED` |
| Stale/wrong web snippets | SYSTEM prompt: cite uncertainty, prefer recent sources |
| Latency (+1–3s per search) | Acceptable for @mention flow; basic depth only |
| 429 misclassified | Log full body; refine heuristics if needed |

## Migration Plan

1. Add `TAVILY_API_KEY` to production `.env` and `.env.template`.
2. Deploy code; append SYSTEM prompt block in Turso.
3. `pm2 restart wetkindnessbot`.
4. Rollback: remove tool from `AGENT_TOOLS` and revert env validation if needed (no DB migration).

## Open Questions

- None blocking v1.
