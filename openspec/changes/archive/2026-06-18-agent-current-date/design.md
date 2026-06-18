## Context

`runModel` in `src/agent/llm.ts` sends a single system message built from `configStore.getPromptByType('SYSTEM')`, loaded from Turso at startup. The prompt is static for the lifetime of the process. The friend group operates on Moscow time (see `getMoscowHour` in `src/initiative/time.ts`). Web search and casual chat both benefit from the model knowing today's calendar date.

The user asked: *"We should add the current date into the system prompt, but it's impossible due to its static nature (stored in a DB). What are the options?"*

**Answer:** The DB prompt can stay static. Dynamic values belong in **code at call time**, not in Turso.

## Goals / Non-Goals

**Goals:**

- Every LLM call receives an accurate current calendar date.
- Single implementation point (`runModel`) covers all agent entry paths.
- Moscow timezone for date (align with icebreaker windows).
- No operator DB migration for v1.

**Non-Goals:**

- Storing date in Turso or refreshing config on a schedule.
- Per-user or per-chat timezones.
- Injecting time-of-day unless explicitly needed later.
- Changing how MID / ICEBREAKER / POLL_OPTIONS user prompts work.

## Decisions

### Options considered

| Option | How it works | Pros | Cons |
|--------|----------------|------|------|
| **A. Runtime prepend (recommended)** | In `runModel`, `system = dateLine + "\n\n" + SYSTEM` | Zero DB change; always fresh; one choke point | Wording/placement fixed in code |
| **B. Placeholder in Turso** | DB contains `{{CURRENT_DATE}}`; code replaces on read | Operator controls copy/placement | Requires prompt edit; broken if placeholder removed |
| **C. Date in user message** | Prefix `buildPersonalizedMessage` with date | No system message change | Weaker model signal; pollutes agent memory |
| **D. Second system/developer message** | Extra message with date only | Separates concerns | Extra API surface; model merge behavior varies |
| **E. Cron refresh of configStore** | Job rewrites in-memory SYSTEM daily | Looks like "dynamic config" | Still wrong mid-day; unnecessary complexity |
| **F. Tool-only date** | Return date from a tool when asked | Minimal | Model must remember to call it; misses implicit needs |

**Decision:** **Option A** for v1 — prepend a fixed Russian/ISO date line in `runModel`.

Example line:

```
Today's date (Europe/Moscow): 2026-06-18 (Wednesday).
```

Use `Intl.DateTimeFormat` with `timeZone: 'Europe/Moscow'` (same pattern as initiative code). ISO date for unambiguous parsing; weekday optional but helps natural language ("on Friday").

**Alternative kept for later:** Option B if operators want to move the sentence into Turso — implement `resolveSystemPrompt(template)` that replaces `{{CURRENT_DATE}}` when present, otherwise prepends default line.

### Where to inject

**Decision:** Only in `runModel`, not in `configStore` or Turso load.

```
configStore SYSTEM (static)
        │
        ▼
runModel() ──► buildSystemContent() ──► OpenAI messages[0]
        ▲
   getMoscowDate() (dynamic, per call)
```

All flows that call `runAgent` → `runModel` get the date automatically (mentions, `/mid`, icebreaker, readycheck poll options).

### Timezone

**Decision:** `Europe/Moscow` — friend group context, already used for icebreaker.

**Alternative:** UTC or server local — rejected; mismatches user expectations.

### Language of date line

**Decision:** English ISO line in system message (matches much of SYSTEM prompt tooling/docs); model still replies in Russian per existing prompt.

**Alternative:** Russian date string — acceptable if operators prefer; easy to swap in helper.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Model ignores date line | Keep line short, first in system content; optional SYSTEM prompt sentence "Use the provided current date" (operator, Turso) |
| Wrong date if server clock skewed | NTP on VPS; date derived from `new Date()` same as rest of app |
| Longer system prompt | One line (~60 chars); negligible vs existing SYSTEM |
| Memory stores dated context | Date not duplicated in user/tool messages; only system side per API call |

## Migration Plan

1. Ship code change to `runModel` / date helper.
2. Deploy and restart bot — no Turso edit required.
3. Optional: operator adds "trust the current date line above" to SYSTEM in Turso.
4. **Rollback:** Revert `llm.ts` helper; static SYSTEM only.

## Open Questions

- Prefer Russian date line vs ISO English? (Default: ISO + weekday in design above.)
- Add optional `{{CURRENT_DATE}}` placeholder (Option B) in same change or follow-up?
