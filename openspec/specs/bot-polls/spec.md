# bot-polls

## Purpose

Generic agent-created Telegram polls with fixed yes/no/maybe options, DB-backed answer tracking, threshold-based completion, manual close, and 24h TTL expiry.

## Requirements

### Requirement: Generic poll options are fixed

Generic agent-created polls SHALL use exactly three non-anonymous options in order: **Да**, **Нет**, **Может быть**. Option index `0` SHALL represent affirmative votes for threshold counting.

#### Scenario: Poll created with fixed options

- **WHEN** the agent invokes the `create_poll` tool
- **THEN** the bot SHALL post a Telegram poll with options `Да`, `Нет`, `Может быть`
- **AND** SHALL set `is_anonymous` to false

### Requirement: create_poll agent tool

The agent SHALL expose a `create_poll` tool that creates a generic poll in the current chat. The tool SHALL require Telegram context provided by `runAgent`. If context is missing, the tool SHALL return an error string to the model and SHALL NOT post a poll.

#### Scenario: Successful poll creation via mention

- **WHEN** a user triggers the agent with a message asking to create a poll
- **AND** `runAgent` is called with valid Telegram context
- **AND** the model invokes `create_poll` with a question
- **THEN** the bot SHALL post the poll in that chat
- **AND** SHALL persist the poll in the database with status `active`

#### Scenario: Poll creation from slash command path

- **WHEN** any code path calls `runAgent` with valid Telegram context
- **AND** the model invokes `create_poll`
- **THEN** the bot SHALL post the poll in the provided chat

#### Scenario: Missing Telegram context

- **WHEN** the model invokes `create_poll`
- **AND** `runAgent` was called without Telegram context
- **THEN** the tool SHALL return an error description to the model
- **AND** SHALL NOT call `sendPoll`

### Requirement: Threshold-based completion summary

When a poll is created with `threshold_yes`, the bot SHALL post a summary reply when the count of distinct users who voted for option index `0` (**Да**) reaches or exceeds `threshold_yes`. Votes for **Может быть** SHALL NOT count toward the threshold.

#### Scenario: Threshold met

- **WHEN** an active poll has `completion_rule` `threshold_yes` and `threshold_yes` of 3
- **AND** three distinct users have voted for option index `0`
- **THEN** the bot SHALL reply to the poll message with a summary listing users who voted **Да**
- **AND** SHALL include users who voted **Может быть** in a separate section if any
- **AND** SHALL set poll status to `completed`

#### Scenario: close_on_complete

- **WHEN** a poll has `close_on_complete` true
- **AND** the threshold completion condition is met
- **THEN** the bot SHALL call `stopPoll` for that poll
- **AND** SHALL post the summary as specified for threshold completion

### Requirement: No threshold means silent tracking

When a poll is created without `threshold_yes`, the bot SHALL track answers until expiry and SHALL NOT post an automatic completion summary.

#### Scenario: Poll without threshold

- **WHEN** an active poll has `completion_rule` `none`
- **AND** users vote on the poll
- **THEN** the bot SHALL persist vote updates
- **AND** SHALL NOT post a completion summary based on vote counts

### Requirement: Poll answer upsert on vote change

The bot SHALL upsert poll answers keyed by `(poll_id, telegram_user_id)` so that when a user changes their vote, the stored answer reflects the latest choice.

#### Scenario: User changes vote

- **WHEN** a user has previously answered a tracked poll
- **AND** the user submits a new `poll_answer` with a different option
- **THEN** the bot SHALL update the stored option index and display name
- **AND** SHALL re-evaluate completion rules using the updated counts

### Requirement: Poll TTL and silent expiry

Active polls SHALL expire 24 hours after creation. Expiry SHALL stop tracking and close the poll in Telegram without posting a chat message.

#### Scenario: Poll expires on startup sweep

- **WHEN** the bot starts
- **AND** an active poll has `expires_at` in the past
- **THEN** the bot SHALL set poll status to `expired`
- **AND** SHALL call `stopPoll` if the poll is still open
- **AND** SHALL NOT send an expiry message to the chat

#### Scenario: Poll expires on lazy check

- **WHEN** a `poll_answer` update is received for a poll past `expires_at`
- **THEN** the bot SHALL expire the poll before processing the vote
- **AND** SHALL NOT post an expiry message

### Requirement: Multiple concurrent polls per chat

The bot SHALL support multiple active tracked polls in the same chat, distinguished by `telegram_poll_id`.

#### Scenario: Two active polls in one chat

- **WHEN** two generic polls are active in the same chat
- **AND** a user answers one poll
- **THEN** the bot SHALL update answers only for the matching poll
- **AND** SHALL NOT affect the other poll's state

### Requirement: Active poll cache at startup

The bot SHALL load all polls with status `active` from the database into an in-memory cache at startup for fast `poll_answer` lookup.

#### Scenario: Restart with active poll

- **WHEN** the bot restarts while generic polls are active
- **THEN** the bot SHALL reload active polls from the database
- **AND** SHALL continue tracking answers for those polls

### Requirement: Untracked poll answers are ignored

`poll_answer` updates for polls not present in the tracking system SHALL be ignored without error.

#### Scenario: Readycheck poll not in generic table

- **WHEN** a `poll_answer` is received for a readycheck poll tracked only in readycheck in-memory state
- **THEN** the generic poll handler SHALL NOT interfere with readycheck handling
