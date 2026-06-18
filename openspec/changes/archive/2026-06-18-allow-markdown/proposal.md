## Why

The agent's SYSTEM prompt currently forbids Markdown because replies are sent as plain text and Telegram would show raw `**` and `[link](url)` syntax. With web search and richer answers, basic formatting (bold, italic, links) would improve readability. Telegram supports this via message entities; the bot should convert LLM Markdown at send time rather than blocking it in the prompt.

## What Changes

- Add a shared helper that converts agent reply text from basic Markdown to Telegram message entities using `@gramio/format`, sends with `{ text, entities }`, and silently falls back to plain text on parse/send errors.
- Wire the helper into all agent outbound message paths: @mention/reply handler, `/mid`, and icebreaker initiative messages.
- Update the SYSTEM config prompt in Turso to allow basic Markdown and forbid HTML (documented in a system-prompt-additions file).
- Poll creation and poll text remain plain — out of scope.

## Capabilities

### New Capabilities

- `bot-message-formatting`: Convert LLM Markdown to Telegram entities for agent replies, with silent plain-text fallback; SYSTEM prompt guidance for allowed Markdown subset.

### Modified Capabilities

<!-- None — poll and storage behavior unchanged at spec level -->

## Impact

- **Dependencies**: `@gramio/format`, peer `marked`
- **Code**: new formatting utility module; `src/bot.ts`, `src/commands/mid.ts`, `src/initiative/silence/icebreaker.ts`
- **Config**: Turso `SYSTEM` prompt append/replace (manual deploy + bot restart)
- **Out of scope**: polls, readycheck HTML messages, `/helpme` static HTML
