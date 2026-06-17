# bot-initiative

## Purpose

Proactive bot-initiated engagement when the group chat is quiet—silence tracking, time-window gating, and LLM icebreaker messages without agent tools.

## ADDED Requirements

### Requirement: Initiative module structure

The bot SHALL implement bot-initiated features under `src/initiative/`. The first submodule SHALL be `silence/` for icebreaker-by-silence. `bot.ts` SHALL register initiative handlers via a single entry point (e.g. `registerInitiative`).

#### Scenario: Initiative registered at startup

- **WHEN** the bot process starts
- **THEN** it SHALL call the initiative registration function before long polling begins

### Requirement: Silence timer reset on chat activity

The bot SHALL maintain a per-chat silence timer. Any incoming chat message SHALL reset the timer for that chat, including messages sent by the bot itself.

#### Scenario: Human message resets timer

- **WHEN** a user posts a text message in a group the bot observes
- **THEN** the bot SHALL cancel any pending silence timeout for that chat
- **AND** SHALL schedule a new timeout with a random duration between `SILENCE_MIN_HOURS` and `SILENCE_MAX_HOURS`

#### Scenario: Bot message resets timer

- **WHEN** the bot sends a message to the chat (including an icebreaker)
- **THEN** the bot SHALL reset the silence timer for that chat
- **AND** if the message was an icebreaker, the next timeout SHALL use a random duration between `ICEBREAKER_COOLDOWN_MIN_HOURS` and `ICEBREAKER_COOLDOWN_MAX_HOURS`

### Requirement: Silence threshold constants

Silence and post-icebreaker cooldown durations SHALL be defined as code constants in `src/initiative/silence/constants.ts`:

- `SILENCE_MIN_HOURS` = 6
- `SILENCE_MAX_HOURS` = 12
- `ICEBREAKER_COOLDOWN_MIN_HOURS` = 8
- `ICEBREAKER_COOLDOWN_MAX_HOURS` = 12

#### Scenario: Random silence duration

- **WHEN** the silence timer is scheduled after chat activity (not after icebreaker)
- **THEN** the timeout duration SHALL be a random value between 6 and 12 hours inclusive

#### Scenario: Random cooldown after icebreaker

- **WHEN** the silence timer is scheduled immediately after the bot sends an icebreaker
- **THEN** the timeout duration SHALL be a random value between 8 and 12 hours inclusive

### Requirement: Moscow time window for icebreakers

The bot SHALL only send icebreaker messages when the current time in `Europe/Moscow` is between 09:00 and 23:59 inclusive.

#### Scenario: Timer fires inside window

- **WHEN** the silence timeout elapses
- **AND** the current Moscow hour is between 9 and 23 inclusive
- **THEN** the bot SHALL attempt to send an icebreaker

#### Scenario: Timer fires outside window

- **WHEN** the silence timeout elapses
- **AND** the current Moscow hour is before 9 or after 23
- **THEN** the bot SHALL NOT send an icebreaker
- **AND** SHALL NOT reschedule or defer the icebreaker to a later time

### Requirement: Icebreaker LLM invocation

When an icebreaker is sent, the bot SHALL call the language model with the `SYSTEM` config as the system message and the `ICEBREAKER` config value as the user message. The call SHALL NOT expose agent tools.

#### Scenario: Icebreaker uses prompts without tools

- **WHEN** the bot sends an icebreaker
- **THEN** it SHALL read `SYSTEM` and `ICEBREAKER` from `configStore`
- **AND** SHALL invoke the agent path with tools disabled
- **AND** SHALL add the exchange to shared agent conversation memory

#### Scenario: Icebreaker LLM failure

- **WHEN** the language model call fails during icebreaker generation
- **THEN** the bot SHALL apply the same fallback behavior as `runAgent` failures
- **AND** SHALL NOT crash or stop long polling

### Requirement: Icebreaker message delivery

Icebreaker messages SHALL be sent as standalone chat messages without `reply_to_message_id`.

#### Scenario: Standalone icebreaker post

- **WHEN** the bot sends an icebreaker after a silence timeout
- **THEN** it SHALL call `sendMessage` with the generated text
- **AND** SHALL NOT set `reply_to_message_id`

### Requirement: Reply to icebreaker uses standard AI flow

When a user replies to an icebreaker message, the bot SHALL handle the reply using the existing AI trigger rules (`mustBeSendToAI`), not a separate code path.

#### Scenario: User replies to icebreaker

- **WHEN** a user replies to a message sent by the bot
- **AND** the reply matches existing AI trigger conditions
- **THEN** the bot SHALL respond via the standard `runAgent` flow with tools enabled

### Requirement: Agent memory limit increase

Shared agent conversation memory SHALL retain up to 200 messages before discarding the oldest entries.

#### Scenario: Memory cap

- **WHEN** the agent adds a message and memory exceeds 200 entries
- **THEN** the bot SHALL remove the oldest message to keep at most 200 entries
