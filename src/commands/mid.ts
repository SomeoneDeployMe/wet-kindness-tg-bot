import {CommandContext} from 'grammy';
import {BotContext} from '../types';
import {CHAT_MEMBERS} from '../consts';

export async function mid(ctx: CommandContext<BotContext>) {
  const membersCount = CHAT_MEMBERS.length;
  const randomUser = CHAT_MEMBERS[Math.floor(Math.random() * membersCount)];

  if (randomUser) {
    await ctx.reply(`На миду сегодня позорится ${randomUser}`);
  }
}
