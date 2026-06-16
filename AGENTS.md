# wet-kindness-tg-bot

## Overview

Personal/humor Telegram bot built for a friend group. Built with [grammy](https://grammy.dev/) and `@grammyjs/chat-members` for member tracking. Features include Dota2 readycheck polls, scheduled "gather for Dota" reminders, slap/spit/mid jokes, random swear-back replies, and message reactions. UI copy is in **Russian**; the informal, tongue-in-cheek tone is intentional—preserve it when editing messages.

## Tech stack

| Area | Choice |
|------|--------|
| Language | TypeScript (strict mode) |
| Runtime | Node.js |
| Bot framework | grammy |
| Package manager | Yarn 4 (`packageManager: yarn@4.1.1`) |
| Dev runner | nodemon + ts-node |
| Prod deploy | `tsc` → `dist/`, managed by pm2 (`wetkindnessbot`) |
| Formatting | Prettier (`.prettierrc`: single quotes, 2-space tabs, semicolons, `bracketSpacing: false`) |

## Repository layout

```
src/
  bot.ts           # Entry point: bot init, setMyCommands, command wiring, handlers
  commands/        # One module per slash command; barrel export in index.ts
  types.ts         # BotContext = grammy Context + ChatMembersFlavor
  consts.ts        # CHAT_MEMBERS parsed from env
  swearBack.ts     # Profanity response helper (uses az lib)
  utils/           # Shared helpers
```

Key files:

- `src/bot.ts` — bot init, `setMyCommands`, command wiring, message/poll handlers
- `src/commands/` — one module per slash command; barrel export in `index.ts`
- `src/types.ts` — `BotContext` = grammy `Context` + `ChatMembersFlavor`
- `src/consts.ts` — `CHAT_MEMBERS` parsed from env
- `src/swearBack.ts` — profanity response helper (uses `az` lib)

## Environment

Copy `.env.template` to `.env` (gitignored). Required variables:

| Variable | Purpose |
|----------|---------|
| `BOT_API_TOKEN` | Telegram Bot API token |
| `CHAT_MEMBERS` | Comma-separated usernames/identifiers for @mentions in group commands |

Never commit real secrets. Use placeholders in docs.

## Commands

| Action | Command |
|--------|---------|
| Install deps | `yarn` |
| Dev (hot reload) | `yarn start:dev` |
| Build | `yarn tsc` |
| Prod start | `yarn start:prod` |
| Prod stop | `yarn stop:prod` |

No test or lint scripts exist today—do not invent them unless adding tooling is explicitly requested.

## Adding a new command

1. Add handler in `src/commands/<name>.ts` (export named function)
2. Re-export from `src/commands/index.ts`
3. Register in `src/bot.ts`: `bot.command(...)` and a `setMyCommands` entry

## Conventions

- Use `BotContext` / `CommandContext<BotContext>` for handlers
- Prefer named exports; match existing import style (`import {foo} from './bar'`)
- Keep changes minimal—this is a small bot, not a framework
- Output goes to `dist/` (gitignored); edit `src/` only
- `CHAT_MEMBERS.length` drives readycheck completion logic—env must match actual group size
- For spec-driven changes, use OpenSpec skills/commands under `.cursor/skills/` and `.cursor/commands/` (config in `openspec/config.yaml`); otherwise work directly in `src/`

## Guardrails

- Do not commit `.env` or real API tokens
- Do not add tests, CI, or heavy abstractions unless asked
- Preserve Russian message strings and the bot's informal voice
- Only create git commits when explicitly requested
