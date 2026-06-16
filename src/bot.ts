import {Bot, GrammyError, HttpError, MemorySessionStorage} from 'grammy';
import 'dotenv/config';
import {type ChatMember} from 'grammy/types';
import {chatMembers} from '@grammyjs/chat-members';
import {
  dota,
  helpme,
  mid,
  readycheck,
  slap,
  spit,
} from './commands';
import {BotContext} from './types';
import {runAgent} from './agent/agent';
import {agentContextFromChat} from './agent/context';
import {Message} from '@grammyjs/types/message';
import {configStore, PromptType} from './store';
import {loadConfig, loadMembers, syncDb} from './db';
import {onPollAnswer} from './polls/handler';
import {initializePolls} from './polls/service';

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

bot.on('poll_answer', onPollAnswer);

bot.on('message', async (ctx) => {
  if (ctx.message.text && mustBeSendToAI(ctx.message)) {
    const response = await runAgent(
      buildPersonalizedMessage(ctx.message),
      agentContextFromChat(ctx.chat.id, ctx.api)
    );

    await ctx.reply(response, {
      reply_to_message_id: ctx.message.message_id,
    });
  }
});

bot.catch((err) => {
  const updateId = err.ctx.update.update_id;
  const e = err.error;

  if (e instanceof GrammyError) {
    console.error(`Error while handling update ${updateId}:`, e.description);
  } else if (e instanceof HttpError) {
    console.error(`Error while handling update ${updateId}:`, e);
  } else {
    console.error(`Error while handling update ${updateId}:`, e);
  }
});

async function start() {
  validateEnv();
  await initConfig();

  await bot.start({
    allowed_updates: ['chat_member', 'message', 'poll_answer'],
  });
}

start().catch((err) => console.error('Failed to start bot:', err));

async function initConfig() {
  await syncDb();

  const configRows = await loadConfig();
  const prompts = configRows
    .filter((row): row is {code: PromptType; value: string} =>
      (['SYSTEM', 'MID', 'POLL_OPTIONS'] as const).includes(
        row.code as PromptType
      )
    )
    .map((row): [PromptType, string] => [row.code, row.value]);

  configStore.prompts = prompts;

  const memberRows = await loadMembers();
  configStore.members = memberRows.map((row) => ({
    id: row.id,
    tgName: row.tg_name,
    name: row.name,
    telegramUserId: row.telegram_user_id,
    active: row.active === 1,
    plays: row.plays === 1,
  }));

  await initializePolls(bot.api);
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
    const member = configStore.getMemberByTgName(message.from.username);

    if (member) {
      return `${member.name}: ${message.text}`;
    }
  }

  return message.text!;
}

function validateEnv() {
  [
    'BOT_API_TOKEN',
    'OPENAI_URL',
    'OPENAI_API_KEY',
    'TURSO_DATABASE_URL',
    'TURSO_AUTH_TOKEN',
    'MODEL',
    'BOT_NAME',
  ].forEach((name) => {
    if (process.env[name] == null || process.env[name] === '') {
      throw new Error(`${name} value must be provided`);
    }
  });
}
