import {CommandContext} from 'grammy';
import {BotContext} from '../types';

export async function spit(ctx: CommandContext<BotContext>) {
  const targetUserMatchResult = /@\S+/.exec(ctx.match);

  if (targetUserMatchResult !== null) {
    const targetUserName = targetUserMatchResult[0];

    ctx.reply(`@${ctx.from!.username} смачно харкает 💦 в ${targetUserName}`);
  } else {
    ctx.reply(
      `@${ctx.from!.username} неосторожно харкает 💦 против ветра. Утрись!`
    );
  }
}
