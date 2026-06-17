## 1. Config and agent groundwork

- [x] 1.1 Add `ICEBREAKER` to `PromptType` in `src/store.ts`
- [x] 1.2 Load `ICEBREAKER` in `initConfig()` (`src/bot.ts`) alongside existing prompts; fail startup if missing
- [x] 1.3 Increase agent memory cap from 50 to 200 in `src/agent/memory.ts`
- [x] 1.4 Add optional `{ tools?: boolean }` to `runAgent`; when `tools: false`, call `runModel` without tools / with `tool_choice: 'none'`

## 2. Initiative module skeleton

- [x] 2.1 Create `src/initiative/time.ts` — `isWithinMoscowWindow(startHour, endHour)` using `Europe/Moscow`
- [x] 2.2 Create `src/initiative/silence/constants.ts` with hour ranges and window bounds (6–12, 8–12, 9–23 MSK)
- [x] 2.3 Create `src/initiative/silence/tracker.ts` — per-chat `Map`, random hour timeout, `recordActivity(chatId, { afterIcebreaker })`
- [x] 2.4 Create `src/initiative/silence/icebreaker.ts` — window check, `runAgent(ICEBREAKER, context, { tools: false })`, `sendMessage` without reply_to
- [x] 2.5 Create `src/initiative/index.ts` — `registerInitiative(bot)` wiring message handler + exports

## 3. Bot integration

- [x] 3.1 Call `registerInitiative(bot)` from `src/bot.ts` during setup
- [x] 3.2 Ensure initiative handler records activity for all group messages without interfering with existing AI handler order

## 4. Verification

- [x] 4.1 Verify TypeScript build (`yarn tsc`) succeeds
- [ ] 4.2 Manual smoke test: after silence threshold (temporarily lower constants for test), icebreaker sends during MSK window
- [ ] 4.3 Manual smoke test: timer fire outside 09–23 MSK skips send (no deferral)
- [ ] 4.4 Manual smoke test: reply to icebreaker triggers standard AI flow
- [ ] 4.5 Manual smoke test: any chat message resets timer; post-icebreaker uses 8–12 h cooldown range
