## Context

The bot responds to AI requests only when @mentioned, when a message starts with `свист`, or when replying to the bot. On quiet weekdays (no Dota gatherings) the group chat can sit silent for hours. Privacy mode is disabled, so the bot receives all group messages but currently ignores them unless they match the AI trigger.

The agent already has shared in-memory conversation memory (50 messages, 5-hour inactivity clear), Turso-backed prompts (`SYSTEM`, `MID`, `POLL_OPTIONS`), and `runAgent` with tool support. An `ICEBREAKER` prompt row already exists in Turso but is not loaded by code.

Future bot-initiated features (scheduled nudges, follow-ups) should share a common home rather than scattering timers across command modules.

## Goals / Non-Goals

**Goals:**

- After a random quiet period (6–12 hours), send an LLM icebreaker during Moscow 09:00–23:59 if the chat is still silent.
- Use `SYSTEM` + `ICEBREAKER` prompts; no agent tools on the icebreaker path.
- Any chat message (human or bot) resets the silence timer with a new random threshold.
- After the bot sends an icebreaker, use a longer cooldown range (8–12 hours) before the next fire is eligible.
- Skip silently when the timer fires outside the allowed time window—no deferral or catch-up.
- Send icebreaker as a standalone message (no `reply_to_message_id`).
- Replies to the icebreaker use the existing `mustBeSendToAI` flow unchanged.
- Increase agent memory limit to 200 messages.
- Establish `src/initiative/` as the module for bot-initiated behavior.

**Non-Goals:**

- Persist silence timers across pm2 restarts.
- Day-of-week or contextual threshold logic.
- Env or Turso configuration for hour ranges (constants in code).
- Migrating `/dota` scheduled "Ну и где все?" into `initiative/`.
- Auto-creating polls from icebreakers.
- Separate icebreaker conversation memory.

## Decisions

### 1. Module layout: `src/initiative/`

**Decision:**

```
src/initiative/
  index.ts              # registerInitiative(bot) — single entry from bot.ts
  time.ts               # isWithinMoscowWindow(startHour, endHour)
  silence/
    constants.ts        # hour ranges and window bounds
    tracker.ts          # per-chat Map, setTimeout, recordActivity
    icebreaker.ts       # fire logic: window check, LLM, sendMessage
```

**Rationale:** Icebreaker is the first proactive feature; future initiatives (weekend nudge, scheduled follow-up) get sibling subdirectories under the same umbrella.

**Alternative considered:** Put silence logic in `src/agent/` — rejected; agent is reactive LLM orchestration, not scheduling.

### 2. Silence tracker mechanics

**Decision:** In-memory `Map<chatId, { timeout, mode: 'silence' | 'cooldown' }>`. On every `message` event:

1. Clear existing timeout for that chat.
2. Schedule new timeout for `random(SILENCE_MIN_HOURS, SILENCE_MAX_HOURS)` hours (or cooldown range if last bot action was icebreaker—see below).

On timeout fire:

1. If not within Moscow window → return (no reschedule until next message).
2. Call icebreaker; on send, the bot's own message triggers `recordActivity`, which schedules cooldown range (8–12 h).

**Rationale:** Bot's icebreaker message counts as activity and naturally enters cooldown mode via the same code path. No special post-send hook needed beyond treating bot messages like any other.

**Mode tracking:** After icebreaker sends, the next `recordActivity` from that message uses `ICEBREAKER_COOLDOWN_*` range instead of `SILENCE_*`. Implement via a per-chat flag `lastInitiativeWasIcebreaker` set before send, consumed on next reset.

**Alternative considered:** Separate post-icebreaker timer — equivalent but duplicates reset logic.

### 3. Random threshold in hours

**Decision:** Constants in `silence/constants.ts`:

```ts
export const SILENCE_MIN_HOURS = 6;
export const SILENCE_MAX_HOURS = 12;
export const ICEBREAKER_COOLDOWN_MIN_HOURS = 8;
export const ICEBREAKER_COOLDOWN_MAX_HOURS = 12;
export const ICEBREAKER_WINDOW_START_HOUR = 9;  // MSK inclusive
export const ICEBREAKER_WINDOW_END_HOUR = 23;   // MSK inclusive (through 23:59)
```

Use `Math.random() * (max - min) + min` converted to milliseconds. No rounding to whole hours required.

**Rationale:** User-specified ranges; avoids predictable schedule-like behavior from fixed intervals.

### 4. Moscow time window

**Decision:** Use `Intl.DateTimeFormat` with `timeZone: 'Europe/Moscow'` to read current hour at fire time. Window: hour >= 9 AND hour <= 23.

If outside window, skip—do not reschedule. Next opportunity only after a new chat message resets the timer.

**Rationale:** User confirmed missing a day is acceptable; defer-to-morning adds complexity for little gain.

### 5. Tools-free LLM path for icebreaker

**Decision:** Add optional parameter to `runAgent`:

```ts
runAgent(message: string, context?: AgentContext, options?: { tools?: boolean })
```

When `tools: false`, pass empty tools array to `runModel` and omit `tools`/`tool_choice` from the OpenAI request (or pass `tool_choice: 'none'`).

Icebreaker calls: `runAgent(icbreakerPrompt, agentContextFromChat(...), { tools: false })`.

**Rationale:** Prevents unprompted poll creation; cheaper and simpler than a separate LLM wrapper.

**Alternative considered:** Duplicate `runModel` call in icebreaker.ts — rejected; reuses memory, fallback, and error handling in `runAgent`.

### 6. ICEBREAKER prompt loading

**Decision:** Add `'ICEBREAKER'` to `PromptType` union. Include in `initConfig()` filter alongside `SYSTEM`, `MID`, `POLL_OPTIONS`. Fail startup if missing (same as other required prompts).

Icebreaker message content = full `ICEBREAKER` config value passed as the user message to `runAgent`.

**Rationale:** Matches `MID` command pattern; operator already seeded Turso.

### 7. Agent memory limit

**Decision:** Change cap in `src/agent/memory.ts` from 50 to 200.

**Rationale:** Longer context helps continuity when users reply to icebreakers later via @mention.

### 8. bot.ts integration

**Decision:** Call `registerInitiative(bot)` once during setup. Inside, register `bot.on('message', ...)` middleware that calls `silenceTracker.recordActivity(ctx.chat.id)` for all messages with a `chat` id (groups/supergroups).

Existing AI handler in `bot.ts` stays separate and unchanged.

**Rationale:** Minimal touch to `bot.ts`; initiative module owns its wiring.

## Risks / Trade-offs

- **[Risk] pm2 restart clears all silence timers** → Acceptable for v1; icebreaker resumes after next message + new random threshold.
- **[Risk] Icebreaker fires during active conversation gap** → 6-hour minimum makes this unlikely; any message resets timer.
- **[Risk] LLM cost on silent days** → At most ~1–2 icebreakers per day with given ranges; tools disabled limits runaway tool loops.
- **[Risk] Shared memory grows to 200 messages → higher token cost on @mentions** → Acceptable trade-off for better context; icebreaker turn is stored like any agent turn.
- **[Risk] Multiple group chats share one process** → Per-chat `Map` handles correctly; each chat has independent timer.
- **[Risk] Icebreaker LLM failure** → Reuse existing `runAgent` fallback; do not send empty or error text to chat (fallback is user-facing—acceptable for icebreaker).

## Migration Plan

1. Ensure `ICEBREAKER` row exists in Turso `config` (operator confirms already seeded).
2. Deploy code; restart pm2 (`wetkindnessbot`).
3. No DB schema changes.
4. Rollback: revert deploy; timers are in-memory only.

## Open Questions

- None blocking implementation.
