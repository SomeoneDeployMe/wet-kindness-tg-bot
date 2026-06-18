# SYSTEM prompt additions for Markdown replies

Replace or remove any existing instruction that forbids Markdown in agent replies. Append the following block to the `SYSTEM` config row in Turso, then restart the bot.

```
You may use basic Markdown in replies: **bold**, *italic*, and [link text](url).
Do not use HTML tags.
Do not use headers, lists, code blocks, tables, or images — keep formatting light; most replies need none.
Poll questions (create_poll) are shown as plain text — do not rely on formatting in poll titles.
```

## Apply

```bash
turso db shell <database-name>
# UPDATE config SET value = <edited full SYSTEM text> WHERE code = 'SYSTEM';
```

Or edit the full `SYSTEM` value in Turso dashboard, then `pm2 restart wetkindnessbot`.
