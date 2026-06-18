# bot-message-formatting

## Purpose

Convert LLM Markdown in agent replies to Telegram message entities with silent plain-text fallback. Poll and static bot messages are unchanged.

## Requirements

### Requirement: Agent replies use Markdown-to-entities conversion

The bot SHALL convert agent reply text from Markdown to Telegram message entities using `@gramio/format` (`markdownToFormattable`) before sending. Sends SHALL use `text` and `entities` parameters and SHALL NOT set `parse_mode`.

#### Scenario: Formatted agent reply

- **WHEN** the agent returns a final text response containing basic Markdown (e.g. `**bold**`, `*italic*`, `[label](https://example.com)`)
- **AND** the bot sends that response to the chat
- **THEN** the bot SHALL convert the text with `markdownToFormattable`
- **AND** SHALL send the resulting plain `text` with `entities` to Telegram
- **AND** SHALL NOT set `parse_mode`

#### Scenario: Plain agent reply unchanged

- **WHEN** the agent returns text with no Markdown syntax
- **THEN** the bot SHALL send the message successfully
- **AND** MAY send with zero or empty entities

### Requirement: Shared send helper for all agent outbound paths

All code paths that send `runAgent` output to Telegram as a chat message SHALL use a single shared helper (e.g. `sendAgentMessage`) that performs conversion and fallback.

#### Scenario: Mention handler

- **WHEN** a user triggers the agent via @mention, reply, or `свист`
- **AND** `runAgent` returns a text response
- **THEN** the bot SHALL send the response via the shared formatting helper

#### Scenario: Mid command

- **WHEN** a user invokes `/mid`
- **AND** `runAgent` returns a text response
- **THEN** the bot SHALL send the response via the shared formatting helper

#### Scenario: Icebreaker initiative

- **WHEN** the silence icebreaker runs `runAgent`
- **AND** `runAgent` returns a text response
- **THEN** the bot SHALL send the response via the shared formatting helper

### Requirement: Silent plain-text fallback

When Markdown conversion or formatted send fails, the bot SHALL send plain text without exposing an error to the user.

#### Scenario: Conversion throws

- **WHEN** `markdownToFormattable` throws while processing agent reply text
- **THEN** the bot SHALL log the error
- **AND** SHALL send the reply as plain text with Markdown delimiters stripped or removed
- **AND** SHALL NOT throw to grammY middleware
- **AND** SHALL NOT send a user-visible formatting error message

#### Scenario: Telegram rejects entities

- **WHEN** Telegram returns an error indicating entity parse failure (e.g. `can't parse entities`)
- **THEN** the bot SHALL retry send once with plain stripped text and no entities
- **AND** SHALL NOT send a user-visible formatting error message

### Requirement: Poll messages remain plain

The bot SHALL NOT apply Markdown-to-entities conversion to poll questions, poll options, or poll completion summaries as part of this change.

#### Scenario: Create poll tool

- **WHEN** the agent creates a poll via `create_poll`
- **THEN** the poll question SHALL be sent as plain text through existing poll creation flow
- **AND** SHALL NOT use the agent message formatting helper for the poll widget

### Requirement: SYSTEM prompt allows basic Markdown

The `SYSTEM` config prompt SHALL instruct the model that basic Markdown is allowed in replies and HTML tags are not. The prompt SHALL discourage headers, lists, code blocks, and tables. The prompt SHALL NOT instruct the model to avoid all formatting.

#### Scenario: Operator updates SYSTEM prompt

- **WHEN** the operator deploys this change
- **THEN** documentation SHALL provide the SYSTEM prompt addition block to apply in Turso
- **AND** the bot SHALL continue to load `SYSTEM` from `configStore` at startup unchanged in mechanism
