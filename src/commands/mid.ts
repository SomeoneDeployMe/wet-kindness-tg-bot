import {CommandContext} from 'grammy';
import {BotContext} from '../types';
import {runAgent} from '../agent/agent';
import {agentContextFromChat} from '../agent/context';
import {configStore} from '../store';

export async function mid(ctx: CommandContext<BotContext>) {
  const midPrompt = configStore.getPromptByType('MID');
  const response = await runAgent(
    midPrompt,
    agentContextFromChat(ctx.chat.id, ctx.api)
  );

  await ctx.reply(response);
}
