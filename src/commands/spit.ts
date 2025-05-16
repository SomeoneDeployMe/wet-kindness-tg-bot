import {CommandContext} from 'grammy';
import {BotContext} from '../types';
import {runAgent} from '../agent/agent';

export async function spit(ctx: CommandContext<BotContext>) {
  const targetUserMatchResult = /@\S+/.exec(ctx.match);

  if (targetUserMatchResult !== null) {
    const targetUserName = targetUserMatchResult[0];

    const response = await runAgent(
      `Describe how @${ctx.from!.username} spits in ${targetUserName} face`
    );

    void ctx.reply(response);
  } else {
    const response = await runAgent(
      `Describe how @${ctx.from!.username} accidentally spat in his own face`
    );

    void ctx.reply(response);
  }
}
