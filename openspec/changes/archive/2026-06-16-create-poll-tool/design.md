## Context

The bot's only poll flow today is `/readycheck`: the command calls `runAgent` for option text, posts a poll via grammY, and tracks answers in a module-level singleton (`activePoll`). The agent has read-only tools (`get_random_chat_member`, `get_the_names_of_all_chat_member`) and `runAgent(message: string)` carries no Telegram context—tools cannot call `sendPoll`.

Users frequently ask the bot in natural language to create ad-hoc polls (e.g. hookah tonight, need 3 people). That requires a side-effect agent tool, persistent poll state across restarts, and a generic `poll_answer` handler decoupled from readycheck.

Turso embedded replica is already used for `config` and `members`. Poll runtime data fits the same stack.

## Goals / Non-Goals

**Goals:**

- Agent `create_poll` tool posts non-anonymous polls with fixed options **Да** / **Нет** / **Может быть**.
- Any `runAgent` caller with Telegram context can trigger poll creation (@mention, reply, `свист`, slash commands).
- Track answers in DB; when `threshold_yes` is met, reply to the poll with a summary (names who voted Да, optionally Может быть).
- If user asked to close on completion, call `stopPoll` before/alongside summary.
- No threshold → track silently until 24h TTL; no auto-summary.
- Expire stale polls after 24h with silent cleanup (`stopPoll`, mark expired, no chat message).
- Multiple concurrent active polls per chat.
- Survive pm2 restart: reload active polls from DB at startup.

**Non-Goals:**

- Migrating `/readycheck` to this engine (future change; schema allows `poll_type` later).
- Custom poll options or anonymous polls.
- Expiry or completion chat messages when threshold not met or poll expires.
- Live DB subscription for poll state (same restart-to-reload model as config).

## Decisions

### 1. Agent context parameter

**Decision:** Change `runAgent` signature to accept an options object:

```ts
type AgentContext = {
  chatId: number;
  reply: (text: string) => Promise<void>; // or Api + chatId for tool side effects
};
runAgent(message: string, context?: AgentContext)
```

Callers that lack context (none today for poll creation, but keep optional) pass message only; `create_poll` returns an error string to the model if context missing.

**Rationale:** Explicit and testable. AsyncLocalStorage is magic; module-level globals break under concurrency.

**Alternative considered:** Set `currentAgentContext` global before each call — rejected as fragile.

### 2. Poll module layout

**Decision:** New `src/polls/`:

- `constants.ts` — `GENERIC_POLL_OPTIONS`, `POLL_TTL_MS` (24h), option index constants
- `types.ts` — `Poll`, `PollAnswer`, status/completion enums
- `repository.ts` — Turso CRUD (`polls`, `poll_answers`)
- `service.ts` — create, upsertAnswer, evaluateCompletion, expirePoll, loadActivePolls
- `handler.ts` — grammY `poll_answer` middleware
- `cache.ts` — in-memory `Map<telegramPollId, Poll>` hydrated at startup

**Rationale:** Keeps `readycheck.ts` untouched; clear boundary for future migration.

### 3. Database schema

**Decision:** Two new tables:

```sql
polls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_poll_id TEXT NOT NULL UNIQUE,
  chat_id INTEGER NOT NULL,
  message_id INTEGER NOT NULL,
  question TEXT NOT NULL,
  poll_type TEXT NOT NULL DEFAULT 'generic',
  options_json TEXT NOT NULL,
  completion_rule TEXT NOT NULL,        -- 'threshold_yes' | 'none'
  threshold_yes INTEGER,
  close_on_complete INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- active | completed | expired
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  completed_at TEXT
)

poll_answers (
  poll_id INTEGER NOT NULL REFERENCES polls(id),
  telegram_user_id INTEGER NOT NULL,
  option_index INTEGER NOT NULL,
  display_name TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (poll_id, telegram_user_id)
)
```

**Rationale:** Normalized answers support vote changes and name snapshots for summaries. `poll_type` and flexible `options_json` preserve readycheck migration path without implementing it now.

### 4. Fixed generic options

**Decision:** Hardcode `['Да', 'Нет', 'Может быть']` in code. Option index `0` = yes (counts toward threshold), `1` = no, `2` = maybe (listed in summary but not counted).

**Rationale:** User confirmed static list; removes model responsibility for option text and parsing.

### 5. Completion rules

**Decision:**

| User intent | `completion_rule` | `threshold_yes` | Behavior |
|-------------|---------------------|-----------------|----------|
| "3 человека хватит" | `threshold_yes` | 3 | Summary when ≥3 Да |
| No number mentioned | `none` | null | Track only until expiry |
| "закрой когда наберётся" | `threshold_yes` + `close_on_complete=1` | parsed N | Summary + `stopPoll` |

Re-evaluate on every vote change; if count drops below threshold while still `active`, do not un-send summary (completion fires once when crossing threshold).

**Rationale:** Matches user decisions; simple state machine.

### 6. Summary message format

**Decision:** Reply to poll message (`reply_to_message_id`). Informal Russian, e.g.:

```
Набрались (3/3):
Вася, Петя, Коля

Может быть: Саша
```

Omit "Может быть" section if empty. Include threshold in header when `threshold_yes` set.

**Rationale:** Threads under poll; preserves bot voice.

### 7. Expiry and cleanup

**Decision:** `expires_at = created_at + 24 hours`. Cleanup triggers:

1. **Startup sweep** — expire all active polls past `expires_at`
2. **Lazy** — on `poll_answer` for that poll, if expired run expire flow first

Expire flow: `status = expired`, call `stopPoll(chat_id, message_id)` (ignore errors if already closed), remove from cache. **No chat message.**

**Rationale:** User chose silent expiry; lazy + startup avoids timers.

### 8. `create_poll` tool schema

**Decision:**

```ts
z.object({
  question: z.string().max(300),
  threshold_yes: z.number().int().min(1).optional(),
  close_on_complete: z.boolean().optional(),
})
```

Tool implementation: validate options count implicitly (fixed 3), `sendPoll` with `is_anonymous: false`, persist row, add to cache, return success string to model.

**Rationale:** Model parses natural language; code owns Telegram limits and fixed options.

### 9. `poll_answer` handler routing

**Decision:** Replace `onReadyCheckAnswer` registration with unified handler that:

1. Looks up poll by `poll_id` in cache (fallback DB query if cache miss after restart race)
2. Ignores unknown polls (untracked Telegram polls, readycheck until migrated)
3. Upserts answer, evaluates completion, expires if needed

**Readycheck:** Keep existing `bot.on('poll_answer', onReadyCheckAnswer)` **or** chain both handlers during transition. For this change, register generic handler **alongside** readycheck; readycheck checks `activePoll` first, generic handler skips if readycheck consumed it. Simpler: generic handler only processes polls found in DB cache; readycheck unchanged.

**Rationale:** Zero regression on `/readycheck`.

### 10. SYSTEM prompt update

**Decision:** Operator updates `SYSTEM` row in Turso (document in tasks): when user asks to create a poll, call `create_poll`; parse threshold and close intent from Russian; do not invent custom options.

**Rationale:** Behavior is prompt-driven like existing tools.

## Risks / Trade-offs

- **[Risk] Two poll systems coexist (readycheck in-memory, generic in DB)** → Acceptable short-term; migration planned. Generic handler ignores non-DB polls.
- **[Risk] Vote change drops yes count below threshold after summary** → Completion is one-way (`status=completed`); edge case rare in friend group.
- **[Risk] `runAgent` signature change touches many call sites** → All must pass context where polls should work; optional context keeps compile-time clarity.
- **[Risk] DB write on every vote** → Tiny data volume; acceptable. Cache avoids read on every vote.
- **[Risk] Model fails to call tool and describes a poll in text only** → Prompt tuning; out of scope for code guardrails.

## Migration Plan

1. Apply `scripts/init-db.sql` additions to Turso (manual `turso db shell` or migration script).
2. Deploy code; restart pm2.
3. Update `SYSTEM` prompt in Turso; restart again (or document two-step).
4. Rollback: revert code; old polls rows harmless; readycheck unaffected.

## Open Questions

- None blocking. Readycheck migration deferred to a follow-up change.
