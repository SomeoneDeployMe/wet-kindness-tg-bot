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
import {runAgent} from './agent/agent';
import {Message} from '@grammyjs/types/message';
import {configStore, PromptType} from './store';
import {supabase} from './supabase';

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

bot.hears(
  /(?<![а-яА-Я])бот(?:а|у|ом|е|ы|ов|ам|ами|ах)?(?![а-яА-Я])/i,
  async (ctx) => {
    if (ctx.message) {
      await ctx.api.setMessageReaction(ctx.chat.id, ctx.message.message_id, [
        {type: 'emoji', emoji: '💩'},
      ]);
    }
  }
);

bot.on('poll_answer', onReadyCheckAnswer);

bot.on('message', async (ctx) => {
  if (ctx.message.text && mustBeSendToAI(ctx.message)) {
    const response = await runAgent(buildPersonalizedMessage(ctx.message));

    await ctx.reply(response, {
      reply_to_message_id: ctx.message.message_id,
    });
  }
});

async function start() {
  validateEnv();

  void bot.start({
    allowed_updates: ['chat_member', 'message', 'poll_answer'],
  });

  await initPrompts();
}

void start();

async function initPrompts() {
  const promptsResponse = await supabase.from('prompts').select('code,value');
  const prompts = promptsResponse.data?.map((p): [PromptType, string] => [
    p.code as PromptType,
    p.value,
  ]);

  if (prompts) {
    configStore.prompts = prompts;
  } else {
    throw new Error('No prompts found');
  }

  const usersResponse = await supabase.from('users').select('tg_name, name');
  const users = usersResponse.data?.map((u): [string, string] => [
    u.tg_name,
    u.name,
  ]);

  if (users) {
    configStore.users = users;
  } else {
    throw new Error('No users found');
  }

  supabase
    .channel('prompts_update')
    .on(
      'postgres_changes',
      {event: 'UPDATE', schema: 'public', table: 'prompts'},
      (payload) => {
        configStore.updatePrompt(payload.new.code, payload.new.value);
      }
    )
    .subscribe();
}

function mustBeSendToAI(message: Message): boolean {
  const botName = process.env.BOT_NAME;

  if (!botName) {
    return false;
  }

  if (!message.text || message.text.length >= 500) {
    return false;
  }

  const messageTextLower = message.text.toLowerCase();
  const botMentionLower = `@${botName}`.toLowerCase();

  if (messageTextLower.startsWith('свист')) {
    return true;
  }

  if (messageTextLower.startsWith(botMentionLower)) {
    return true;
  }

  const replyToMessage = message.reply_to_message;
  if (replyToMessage?.from) {
    return (
      replyToMessage.from.username === botName &&
      replyToMessage.from.is_bot === true
    );
  }

  return false;
}

function buildPersonalizedMessage(message: Message): string {
  if (message.from?.username) {
    const userName = configStore.users.get(message.from.username);

    if (userName) {
      return `${userName}: ${message.text}`;
    }
  }

  return message.text!;
}

function validateEnv() {
  [
    'BOT_API_TOKEN',
    'OPENAI_URL',
    'OPENAI_API_KEY',
    'SUPABASE_URL',
    'SUPABASE_KEY',
    'MODEL',
    'BOT_NAME',
  ].forEach((name) => {
    if (process.env[name] == null || process.env[name] === '') {
      throw new Error(`${name} value must be provided`);
    }
  });
}
