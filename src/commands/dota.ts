import {CHAT_MEMBERS} from '../consts';
import {CommandContext} from 'grammy';
import {BotContext} from '../types';

export function dota(ctx: CommandContext<BotContext>) {
  ctx.reply(`15 минут на поссать и погнали ${CHAT_MEMBERS.join(' ')}`);
}
