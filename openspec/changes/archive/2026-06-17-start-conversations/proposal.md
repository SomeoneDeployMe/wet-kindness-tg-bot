## Why

The friend-group chat is often quiet on weekdays when nobody is gathering for Dota. The bot only responds when @mentioned or replied to, so it never takes initiative during long silences. A proactive icebreaker—asking why it's quiet and suggesting an activity—would keep the group engaged without requiring someone to ping the bot first.

## What Changes

- Add a **silence-triggered icebreaker**: after random quiet period (6–12 hours), the bot sends an LLM-generated message during Moscow daytime hours (09:00–23:00).
- Use the existing **`ICEBREAKER`** config prompt from Turso (plus `SYSTEM` for personality).
- Any message in the chat (human or bot) resets the silence timer; after the bot sends an icebreaker, a longer cooldown (8–12 hours) applies before the next attempt.
- If the timer fires outside the allowed time window, skip silently—no catch-up or deferral to the next day.
- Icebreaker messages are sent without `reply_to_message_id`; replies to the bot follow the existing @mention/reply AI flow.
- Increase shared agent conversation memory from 50 to 200 messages.
- Introduce `src/initiative/` as the home for bot-initiated features (icebreaker is the first submodule).

## Capabilities

### New Capabilities

- `bot-initiative`: Proactive bot-initiated engagement—silence tracking per chat, random hour-based thresholds, Moscow time window gating, and LLM icebreaker messages.

### Modified Capabilities

- `bot-storage`: Load `ICEBREAKER` config code at startup alongside existing prompts; fail startup if the row is missing.

## Impact

- **Code**: new `src/initiative/` module (`silence/` submodule), `src/bot.ts` (register initiative hooks), `src/store.ts` (`PromptType`), `src/agent/agent.ts` or `llm.ts` (optional tools-free agent path), `src/agent/memory.ts` (limit 200).
- **Database**: `ICEBREAKER` row must exist in Turso `config` (operator already seeded).
- **Out of scope**: Persisting silence timers across restarts; day-of-week logic; migrating `/dota` scheduled follow-up into `initiative/`; env-based threshold configuration; auto-creating polls from icebreakers.
