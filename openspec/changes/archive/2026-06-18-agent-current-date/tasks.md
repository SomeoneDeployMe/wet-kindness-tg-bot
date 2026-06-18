## 1. Date helper



- [x] 1.1 Add `getMoscowDateLine()` (or extend `src/initiative/time.ts`) — format current calendar date in `Europe/Moscow` for the system message (ISO date + weekday)



## 2. System message assembly



- [x] 2.1 Add `buildSystemPrompt(staticSystem: string)` that prepends the date line to `configStore` SYSTEM text

- [x] 2.2 Use `buildSystemPrompt` in `src/agent/llm.ts` when constructing the system message for OpenAI



## 3. Verification



- [ ] 3.1 Manual: trigger agent (e.g. @mention) and confirm model answers with correct "today" when asked

- [x] 3.2 Confirm Turso `SYSTEM` row unchanged — no operator migration required

