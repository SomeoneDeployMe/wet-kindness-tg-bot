## Context

Agent replies (`runAgent` output) are sent as plain text from three call sites: the main message handler in `bot.ts`, `/mid`, and the silence icebreaker. The SYSTEM prompt in Turso forbids Markdown because Telegram would show literal `**` and link syntax. Hand-written bot messages elsewhere already use HTML with `parse_mode` (`/helpme`, readycheck results), but LLM output is not sanitized or formatted.

Telegram supports rich text via `MessageEntity` arrays (no `parse_mode`). The `@gramio/format` library converts standard Markdown to `{ text, entities }` and is framework-agnostic (works with grammY's `ctx.reply` / `api.sendMessage`).

## Goals / Non-Goals

**Goals:**

- Convert LLM Markdown to Telegram entities at send time using `@gramio/format` (`markdownToFormattable`).
- Support basic formatting: **bold**, *italic*, `[text](url)` links (library may also handle code/strikethrough; SYSTEM prompt keeps usage minimal).
- Silent fallback to plain text when Telegram rejects entities or conversion fails.
- Wire all agent outbound message paths through one helper.
- Document SYSTEM prompt changes (allow Markdown, forbid HTML).

**Non-Goals:**

- Poll question or option formatting (Telegram poll API limits; unchanged).
- Refactoring static HTML messages (`/helpme`, readycheck) to `@grammyjs/parse-mode`.
- Streaming formatted LLM output (`@grammyjs/stream`).
- Splitting messages longer than 4096 characters (existing behavior; no change).
- HTML from the LLM or internal HTML conversion exposed to the model.

## Decisions

### 1. Library: `@gramio/format` + `marked`

**Decision:** Add `@gramio/format` and peer dependency `marked`. Use `markdownToFormattable` from `@gramio/format/markdown`.

**Rationale:** Purpose-built for LLM Markdown → Telegram entities; outputs Bot API–compatible `{ type: "bold", offset, length }` entities; malformed Markdown degrades locally. Avoids MarkdownV2 escaping and `parse_mode` rejection. Chosen over `telegramify-markdown` (MarkdownV2 + more send-time failures) and `@vcc-community/telegramify-markdown` (wrong entity shape for Bot API).

**Alternative considered:** `@grammyjs/parse-mode` — rejected for LLM path; it builds formatted text in code, does not parse Markdown strings.

### 2. Send via entities, not parse_mode

**Decision:**

```ts
const formatted = markdownToFormattable(text);
await api.sendMessage(chatId, formatted.text, {
  entities: formatted.entities,
  ...otherOptions,
});
```

Do **not** set `parse_mode` when sending with `entities`.

**Rationale:** Entities approach matches `@gramio/format` output and avoids double-parsing.

### 3. Module layout

**Decision:**

```
src/utils/
  sendAgentMessage.ts   — sendAgentMessage(api, chatId, text, options?)
  stripMarkdown.ts      — plain-text fallback (remove common markdown delimiters)
```

Export `sendAgentMessage` from `src/utils/index.ts`.

**Rationale:** Formatting is a Telegram transport concern at the send boundary; `runAgent` stays a plain string return.

### 4. Fallback behavior

**Decision:** Two-layer safety:

1. **Conversion:** If `markdownToFormattable` throws, log and send `stripMarkdown(text)` with no entities.
2. **Telegram send:** If `sendMessage`/`reply` throws `GrammyError` with description indicating entity parse failure (e.g. `can't parse entities`), retry once with `stripMarkdown(text)` and no entities. No user-visible error message.

**Rationale:** Matches `bot-reliability` (handlers must not crash polling). User requested silent fallback.

**Alternative considered:** User-facing "сломалась вёрстка" — rejected per product decision.

### 5. Call sites

**Decision:** Replace direct `ctx.reply(response)` / `api.sendMessage(chatId, text)` with `sendAgentMessage` in:

- `src/bot.ts` — AI message handler
- `src/commands/mid.ts`
- `src/initiative/silence/icebreaker.ts`

**Rationale:** Single behavior for all agent-generated text.

### 6. SYSTEM prompt

**Decision:** Add `system-prompt-additions.md` with a block to append/replace in Turso `SYSTEM` config. Remove "never send markdown" guidance; allow basic Markdown; forbid HTML; note polls stay plain.

**Rationale:** Same operator workflow as `web_search` and `create_poll` prompt updates.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Model overuses headers/lists/code blocks | SYSTEM prompt restricts to basic inline formatting; `@gramio/format` renders extras harmlessly |
| Entity offset errors with emoji/surrogate pairs | `@gramio/format` handles UTF-16; catch Telegram errors → plain fallback |
| `stripMarkdown` leaves odd remnants on edge cases | Good enough for rare fallback; log warnings for operator |
| Library converts more than "basic" subset | Acceptable; prompt constrains model; no user harm |
| Operator forgets SYSTEM prompt update | Document in tasks + `system-prompt-additions.md`; bot works either way (formatting just unused if model still avoids Markdown) |

## Migration Plan

1. Merge code; run `yarn` to install `@gramio/format` and `marked`.
2. Deploy bot binary; restart process.
3. Update Turso `SYSTEM` row using `system-prompt-additions.md`; restart bot.
4. **Rollback:** Revert code to plain `reply`; restore previous SYSTEM prompt text in Turso.

## Open Questions

<!-- None — scope and library choice confirmed in exploration -->
