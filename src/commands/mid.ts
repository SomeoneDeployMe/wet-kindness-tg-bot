import {CommandContext} from 'grammy';
import {BotContext} from '../types';
import {runAgent} from '../agent/agent';
import {configStore} from '../store';

export async function mid(ctx: CommandContext<BotContext>) {
  const midPrompt = configStore.getPromptByType('MID');
  const response = await runAgent(midPrompt);

  await ctx.reply(response);
}
