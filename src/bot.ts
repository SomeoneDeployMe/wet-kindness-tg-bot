import {Bot, MemorySessionStorage} from 'grammy';
import 'dotenv/config';
import {type ChatMember} from 'grammy/types';
import {chatMembers} from '@grammyjs/chat-members';
import {dota, helpme, slap} from './commands';
import {BotContext} from './types';

const storageAdapter = new MemorySessionStorage<ChatMember>();

const bot = new Bot<BotContext>(process.env.BOT_API_TOKEN!);

bot.use(chatMembers(storageAdapter));

bot.api.setMyCommands([
  {command: 'start', description: 'Выразить почтение'},
  {command: 'dota', description: 'Запросить заседание по вопросам подъёма ММР'},
  {command: 'slap', description: 'Дать леща @мимокроку'},
  {command: 'helpme', description: 'Ну и на что этот Generative AI способен?'},
]);

bot.command('start', async (ctx) => {
  ctx.reply('Вечер в хату');
});

bot.command('dota', dota);
bot.command('slap', slap);
bot.command('helpme', helpme);

bot.start({
  allowed_updates: ['chat_member', 'message'],
});
