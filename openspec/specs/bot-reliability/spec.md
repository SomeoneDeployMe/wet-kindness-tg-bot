# bot-reliability

## Purpose

Resilience to external failures (LLM, Telegram API, tool calls) so the bot continues long polling and returns user-facing fallback replies instead of going silent until restart.

## Requirements

### Requirement: Long polling survives handler errors

The bot SHALL register a grammY error handler via `bot.catch()` before starting long polling. Handler errors SHALL NOT stop the bot from fetching and processing subsequent updates.

#### Scenario: LLM failure does not stop polling

- **WHEN** a message handler throws because the language model request failed
- **THEN** the bot SHALL log the error
- **AND** SHALL continue long polling for new updates

#### Scenario: Subsequent mention after failure

- **WHEN** a handler error occurred on a previous update
- **AND** a user sends a new @mention or AI-triggered message
- **THEN** the bot SHALL process the new update normally

### Requirement: Agent failures return fallback instead of throwing

The agent (`runAgent`) SHALL catch errors from the language model and tool execution. On failure it SHALL return a predefined fallback message string and SHALL NOT propagate the error to grammY middleware.

#### Scenario: Language model unavailable

- **WHEN** the language model API returns an error or times out during `runAgent`
- **THEN** `runAgent` SHALL return the fallback message
- **AND** SHALL NOT throw

#### Scenario: Tool execution error

- **WHEN** a tool call fails with an error during `runAgent`
- **THEN** `runAgent` SHALL return the fallback message
- **AND** SHALL NOT throw

#### Scenario: Fallback message tone

- **WHEN** the agent returns a fallback message due to failure
- **THEN** the message SHALL be in Russian
- **AND** SHALL use the bot's informal voice
- **AND** SHALL NOT expose internal error details to the user

### Requirement: Agent memory rollback on failure

The agent SHALL NOT leave partial conversation state in shared memory after a failed invocation.

#### Scenario: Failure after user message added

- **WHEN** `runAgent` adds a user message to shared memory
- **AND** a subsequent language model or tool call fails before the invocation completes
- **THEN** all messages added during that invocation SHALL be removed from shared memory

#### Scenario: Successful invocation preserves memory

- **WHEN** `runAgent` completes successfully
- **THEN** messages added during that invocation SHALL remain in shared memory

### Requirement: Agent loop iteration limit

The agent loop SHALL have a maximum iteration count to prevent infinite execution when the model misbehaves.

#### Scenario: Model never returns final content

- **WHEN** the language model repeatedly returns tool calls without a final text response
- **AND** the iteration limit is reached
- **THEN** `runAgent` SHALL return the fallback message
- **AND** SHALL roll back memory for that invocation

### Requirement: Startup fail-fast unchanged

Startup validation for environment variables and database configuration SHALL continue to fail fast with clear errors. This change SHALL NOT alter existing `bot-storage` startup requirements.

#### Scenario: Missing env var at startup

- **WHEN** a required environment variable is missing at startup
- **THEN** the bot SHALL fail to start with a clear error message
