import {Bot, MemorySessionStorage} from 'grammy';
import 'dotenv/config';
import {type ChatMember} from 'grammy/types';
import {chatMembers} from '@grammyjs/chat-members';
import {
  dota,
  helpme,
  mid,
  onReadyCheckAnswer,
  readycheck,
  slap,
  spit,
} from './commands';
import {BotContext} from './types';

const storageAdapter = new MemorySessionStorage<ChatMember>();

export const bot = new Bot<BotContext>(process.env.BOT_API_TOKEN!);

bot.use(chatMembers(storageAdapter));

bot.api.setMyCommands([
  {command: 'start', description: 'Выразить почтение'},
  {command: 'readycheck', description: 'Dota2 readycheck'},
  {command: 'dota', description: 'Запросить заседание по вопросам подъёма ММР'},
  {command: 'mid', description: 'Отправить бездаря на мид'},
  {command: 'slap', description: 'Дать леща @мимокроку'},
  {command: 'spit', description: 'Обидно харкнуть в @мимокрока'},
  {command: 'helpme', description: 'Ну и на что этот Generative AI способен?'},
]);

bot.command('start', async (ctx) => {
  await ctx.reply('Вечер в хату');
});

bot.command('readycheck', readycheck);
bot.command('dota', dota);
bot.command('mid', mid);
bot.command('slap', slap);
bot.command('spit', spit);
bot.command('helpme', helpme);

bot.hears(/(?<![а-яА-Я])(спал|заснул|окуклился)(?![а-яА-Я])/i, async (ctx) => {
  if (ctx.message) {
    await ctx.api.setMessageReaction(ctx.chat.id, ctx.message.message_id, [
      {type: 'emoji', emoji: '🤡'},
    ]);
  }
});

bot.on('poll_answer', onReadyCheckAnswer);

bot.start({
  allowed_updates: ['chat_member', 'message', 'poll_answer'],
});
