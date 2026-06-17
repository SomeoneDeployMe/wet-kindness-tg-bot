## MODIFIED Requirements

### Requirement: Config table schema and storage

The database SHALL store bot configuration in a `config` table with columns `code` (primary key), `value` (unconstrained text), `created_at`, and `updated_at`. Required config codes are `SYSTEM`, `MID`, `POLL_OPTIONS`, and `ICEBREAKER`.

#### Scenario: Required config codes present at startup

- **WHEN** the bot starts and queries the `config` table
- **THEN** it SHALL find rows for `SYSTEM`, `MID`, `POLL_OPTIONS`, and `ICEBREAKER`
- **AND** SHALL fail startup with a clear error if any required code is missing

#### Scenario: Additional config keys allowed

- **WHEN** the `config` table contains rows with codes other than `SYSTEM`, `MID`, `POLL_OPTIONS`, or `ICEBREAKER`
- **THEN** the bot MAY load them into `configStore` without requiring them at startup

## ADDED Requirements

### Requirement: Icebreaker prompt for initiative

The bot SHALL load the `ICEBREAKER` config code into `configStore` at startup and SHALL expose it via `PromptType` for use by the initiative icebreaker flow.

#### Scenario: Icebreaker prompt loaded

- **WHEN** the bot starts and finds an `ICEBREAKER` row in the `config` table
- **THEN** it SHALL store the value in `configStore`
- **AND** SHALL make it available via `getPromptByType('ICEBREAKER')`

#### Scenario: Icebreaker prompt missing

- **WHEN** the bot starts and the `ICEBREAKER` row is absent from the `config` table
- **THEN** the bot SHALL fail startup with a clear error
