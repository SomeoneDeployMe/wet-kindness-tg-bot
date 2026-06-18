## Why

Chat members ask the bot for time-sensitive facts—pro Dota schedules, patch notes, roster news—that are not in conversation memory or existing tools. Dedicated esports APIs require extra signups (Liquipedia LPDB, Stratz Steam login) or lack upcoming fixtures (OpenDota). A Tavily web-search agent tool lets the bot ground answers in fresh web results from natural-language questions without maintaining scrapers.

## What Changes

- Add a `web_search` agent tool backed by the Tavily Search API (`search_depth: basic`, 1 credit per call).
- Enforce a hard cap of **2** `web_search` calls per `runAgent` run (count tracked in the agent loop, not only via prompt).
- Handle Tavily failures gracefully—especially **credit exhaustion** (429 / quota errors)—returning a structured tool error to the model so the bot replies in Russian without crashing or hallucinating results.
- Require `TAVILY_API_KEY` at startup (same pattern as other env vars).
- Document `SYSTEM` prompt additions for when to search, query tips, and how to respond when search is unavailable.

## Capabilities

### New Capabilities

- `bot-web-search`: Tavily-backed `web_search` agent tool, per-run search budget, and credit-exhaustion / API error handling.

### Modified Capabilities

<!-- none -->

## Impact

- **Code**: `src/agent/agent.ts` (search counter), `src/agent/tools/` (new `webSearch.ts`, update `runner.ts`), new `src/tavily/` client module, `src/bot.ts` (`validateEnv`).
- **Dependencies**: `@tavily/core` (official Tavily JS SDK).
- **Environment**: New `TAVILY_API_KEY` in `.env` / deployment secrets.
- **Prompts**: Operator appends web-search block to `SYSTEM` config in Turso (documented in `system-prompt-additions.md`).
- **Out of scope**: Tavily Extract/Crawl/Research; proactive scheduled notifications; OpenDota or Liquipedia direct integrations; billing alerts beyond in-chat graceful degradation.
