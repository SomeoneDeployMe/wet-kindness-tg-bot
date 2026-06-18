## 1. Dependencies

- [x] 1.1 Add `@gramio/format` and `marked` to `package.json` (`yarn add @gramio/format marked`)

## 2. Formatting utilities

- [x] 2.1 Add `src/utils/stripMarkdown.ts` — strip common Markdown delimiters for plain-text fallback
- [x] 2.2 Add `src/utils/sendAgentMessage.ts` — convert with `markdownToFormattable`, send `{ text, entities }`, catch conversion errors and Telegram entity parse errors, retry with stripped plain text (log only, no user error)
- [x] 2.3 Export new helpers from `src/utils/index.ts`

## 3. Wire call sites

- [x] 3.1 Use `sendAgentMessage` in `src/bot.ts` AI message handler (preserve `reply_to_message_id`)
- [x] 3.2 Use `sendAgentMessage` in `src/commands/mid.ts`
- [x] 3.3 Use `sendAgentMessage` in `src/initiative/silence/icebreaker.ts`

## 4. SYSTEM prompt and deploy notes

- [x] 4.1 Verify `system-prompt-additions.md` documents Turso `SYSTEM` update (allow basic Markdown, forbid HTML)
- [ ] 4.2 Operator: update `SYSTEM` row in Turso (remove old "never markdown" guidance, append new block) and restart bot after deploy

## 5. Manual verification

- [ ] 5.1 Send agent reply with `**bold**`, `*italic*`, and a link — confirm Telegram renders formatting
- [ ] 5.2 Confirm plain agent reply still sends normally
- [ ] 5.3 Confirm poll creation text is unchanged (plain poll question)
