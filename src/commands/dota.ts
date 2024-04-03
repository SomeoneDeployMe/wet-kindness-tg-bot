import {CHAT_MEMBERS} from '../consts';
import {CommandContext} from 'grammy';
import {BotContext} from '../types';

const pluralRules = new Intl.PluralRules('ru-RU');
const minuteSuffixes = new Map([
  ['one', 'минуту'],
  ['few', 'минуты'],
  ['many', 'минут'],
]);
const defaultMinutesDelay = 0;
let scheduledReplyTimeout: NodeJS.Timeout | null = null;

export async function dota(ctx: CommandContext<BotContext>) {
  const {match} = ctx;
  const matches = /\d+/.exec(match);
  const minutes = matches !== null ? Number(matches[0]) : defaultMinutesDelay;

  if (minutes === 0) {
    await ctx.reply(
      `Внезапный экстракшон мужиков в дотан ${CHAT_MEMBERS.join(' ')}`
    );

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
    await ctx.reply(
      `"Галя! У нас отмена!" Теперь собираемся через ${minutes} ${getMinuteSuffix(minutes)} ${CHAT_MEMBERS.join(' ')}`
    );

    resetScheduledTimer();
  } else {
    await ctx.reply(
      `${minutes} ${getMinuteSuffix(minutes)} на припудриться и погнали ${CHAT_MEMBERS.join(' ')}`
    );
  }

  scheduledReplyTimeout = setTimeout(
    () => {
      ctx.reply(`Ну и где все? ${CHAT_MEMBERS.join(' ')}`);

      resetScheduledTimer();
    },
    minutes * 60 * 1000
  );

  return;
}

function getMinuteSuffix(minutes: number) {
  return minuteSuffixes.get(pluralRules.select(minutes)) ?? 'минут';
}

function resetScheduledTimer() {
  if (scheduledReplyTimeout) {
    clearTimeout(scheduledReplyTimeout);
  }

  scheduledReplyTimeout = null;
}
