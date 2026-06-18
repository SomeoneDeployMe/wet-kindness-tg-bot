## MODIFIED Requirements

### Requirement: ConfigStore hydration at startup

The bot SHALL hydrate the in-memory `configStore` from Turso at startup. Runtime reads of config and members SHALL use `configStore`, not direct database queries.

#### Scenario: System prompt for LLM

- **WHEN** the agent calls the language model
- **THEN** it SHALL use the `SYSTEM` config value from `configStore` as the static base system instructions
- **AND** SHALL prepend or combine a runtime-generated current calendar date (Europe/Moscow) into the system message sent to the model
- **AND** SHALL compute that date at call time, not store it in Turso

#### Scenario: Message personalization

- **WHEN** a user sends a message to the AI and their Telegram username exists in `configStore` members
- **THEN** the bot SHALL prefix the message with the friendly `name` for that member
