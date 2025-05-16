import {CommandContext} from 'grammy';
import {BotContext} from '../types';
import {runAgent} from '../agent/agent';

const defaultMinutesDelay = 0;
let scheduledReplyTimeout: NodeJS.Timeout | null = null;

export async function dota(ctx: CommandContext<BotContext>) {
  const {match} = ctx;
  const matches = /\d+/.exec(match);
  const minutes = matches !== null ? Number(matches[0]) : defaultMinutesDelay;

  if (minutes === 0) {
    const response = await runAgent(`Call all chat members to play Dota`);

    await ctx.reply(response);

    resetScheduledTimer();

    return;
  }

  if (minutes > 60) {
    await ctx.reply(`Ты еще в 2007-м предложи собраться, попущ`, {
      reply_to_message_id: ctx.message!.message_id,
    });

    return;
  }

  if (scheduledReplyTimeout) {
    const response = await runAgent(
      `Gather all chat members to play Dota after ${minutes}`
    );

    await ctx.reply(response);

    resetScheduledTimer();
  } else {
    const response = await runAgent(
      `Announce to all chat members that we are going to play Dota in ${minutes} minutes`
    );

    await ctx.reply(response);
  }

  scheduledReplyTimeout = setTimeout(
    () => {
      ctx.reply(`Ну и где все?`);

      resetScheduledTimer();
    },
    minutes * 60 * 1000
  );

  return;
}

function resetScheduledTimer() {
  if (scheduledReplyTimeout) {
    clearTimeout(scheduledReplyTimeout);
  }

  scheduledReplyTimeout = null;
}
