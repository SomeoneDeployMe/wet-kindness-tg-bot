import {CommandContext} from 'grammy';
import {BotContext} from '../types';
import {runAgent} from '../agent/agent';
import {agentContextFromChat} from '../agent/context';

export async function slap(ctx: CommandContext<BotContext>) {
  const result = /@\S+/.exec(ctx.match);

  if (result !== null) {
    const targetUserName = result[0];

    const response = await runAgent(
      `Describe how ${targetUserName} gets a juicy slap in the face from @${ctx.from!.username}`,
      agentContextFromChat(ctx.chat.id, ctx.api)
    );

    void ctx.reply(response);
  } else {
    const response = await runAgent(
      `Describe how @${ctx.from!.username} accidentally hits himself in the face`,
      agentContextFromChat(ctx.chat.id, ctx.api)
    );

    void ctx.reply(response);
  }
}
