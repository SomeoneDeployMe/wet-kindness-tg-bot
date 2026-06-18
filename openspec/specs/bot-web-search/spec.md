# bot-web-search

## Purpose

Tavily-backed web search agent tool for grounding replies in fresh external facts, with per-run search limits and graceful handling of API failures including credit exhaustion.

## Requirements

### Requirement: web_search agent tool

The agent SHALL expose a `web_search` tool that queries the Tavily Search API with `search_depth: basic` and returns structured search results to the model. The tool SHALL accept a single required parameter `query` (string, max 400 characters).

#### Scenario: Successful search

- **WHEN** the model invokes `web_search` with a valid query
- **AND** Tavily returns HTTP 200 with results
- **THEN** the tool SHALL return a JSON string containing the query and an array of results with `title`, `url`, and `content` for each hit
- **AND** SHALL NOT throw an uncaught exception

#### Scenario: Empty results

- **WHEN** Tavily returns HTTP 200 with no results
- **THEN** the tool SHALL return a JSON string indicating zero results
- **AND** SHALL allow the agent loop to continue

### Requirement: Per-run search call limit

The agent SHALL allow at most **2** `web_search` tool executions per single `runAgent` invocation. The limit SHALL be enforced in code before calling Tavily.

#### Scenario: Third search blocked

- **WHEN** the model invokes `web_search` for a third time in the same `runAgent` run
- **THEN** the tool SHALL NOT call Tavily
- **AND** SHALL return a message prefixed with `SEARCH_LIMIT_REACHED:`
- **AND** SHALL allow the agent loop to continue so the model can reply without further searches

#### Scenario: Counter resets per user message

- **WHEN** a new `runAgent` invocation starts for a user message
- **THEN** the search call counter SHALL reset to zero

### Requirement: Tavily credit exhaustion handling

When Tavily indicates that API credits or monthly quota are exhausted, the tool SHALL return a structured error to the model and SHALL NOT crash the agent.

#### Scenario: Monthly credits exhausted

- **WHEN** Tavily responds with HTTP 429
- **AND** the error body indicates credit or quota exhaustion
- **THEN** the tool SHALL return a message prefixed with `CREDITS_EXHAUSTED:`
- **AND** SHALL log a warning with the HTTP status
- **AND** SHALL NOT truncate agent memory or return `AGENT_FALLBACK_MESSAGE`

#### Scenario: Model responds after credit exhaustion

- **WHEN** the tool returns `CREDITS_EXHAUSTED:`
- **THEN** the model SHALL be able to complete the agent loop with a user-facing reply explaining that web search is temporarily unavailable

### Requirement: Tavily API error handling

The tool SHALL handle non-success Tavily responses without crashing `runAgent`.

#### Scenario: Rate limit without credit exhaustion

- **WHEN** Tavily responds with HTTP 429 for request rate (not credit quota)
- **THEN** the tool SHALL return a message prefixed with `RATE_LIMITED:`

#### Scenario: Authentication failure

- **WHEN** Tavily responds with HTTP 401 or 403
- **THEN** the tool SHALL return a message prefixed with `SEARCH_AUTH_ERROR:`
- **AND** SHALL log an error for operator attention

#### Scenario: Server or network failure

- **WHEN** Tavily responds with HTTP 5xx, times out, or returns malformed JSON
- **THEN** the tool SHALL return a message prefixed with `SEARCH_UNAVAILABLE:`
- **AND** SHALL log the error
- **AND** SHALL NOT truncate agent memory

### Requirement: Tavily API key configuration

The bot SHALL require `TAVILY_API_KEY` at startup.

#### Scenario: Missing API key

- **WHEN** the bot process starts
- **AND** `TAVILY_API_KEY` is missing or empty
- **THEN** startup SHALL fail with an explicit error before long polling begins
