import {Bot} from 'grammy';
import {BotContext} from '../types';
import {sendIcebreaker} from './silence/icebreaker';
import {recordActivity, setSilenceHandler} from './silence/tracker';

export function registerInitiative(bot: Bot<BotContext>) {
  setSilenceHandler(sendIcebreaker);

  bot.use(async (ctx, next) => {
    const chat = ctx.chat;

    if (
      ctx.message &&
      chat &&
      (chat.type === 'group' || chat.type === 'supergroup')
    ) {
      recordActivity(chat.id, ctx.api);
    }

    await next();
  });
}
