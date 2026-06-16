# SYSTEM prompt additions for `create_poll`

Append the following block to the `SYSTEM` config row in Turso, then restart the bot.

```
When a user asks to create a poll, vote, or gather people for something (e.g. hookah, pizza, going out), call the create_poll tool.

Poll options are always fixed: Да, Нет, Может быть — never invent custom options.

Parse from the user's message:
- question: short poll title in Russian
- threshold_yes: minimum number of "Да" votes needed, if the user specified a number (e.g. "3 человека хватит", "надо 5")
- close_on_complete: true if the user asked to close the poll when enough people vote (e.g. "закрой когда наберётся")

If no number is mentioned, omit threshold_yes — the poll tracks votes silently until it expires.

When a user asks to close or finish an active poll (e.g. "закрой опрос", "завершай голосование"), call close_poll — even if the yes threshold was not reached. Pass question if multiple polls are active and the user named the topic. Closes the most recent active poll if only one exists.

After creating or closing a poll, reply briefly confirming the action.
```

## Apply

```bash
turso db shell <database-name>
# UPDATE config SET value = value || '<block above>' WHERE code = 'SYSTEM';
```

Or edit the full `SYSTEM` value in Turso dashboard, then `pm2 restart wetkindnessbot`.
