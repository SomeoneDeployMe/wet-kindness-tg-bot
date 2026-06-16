import {Filter} from 'grammy/out/filter';
import {BotContext} from '../types';
import {onReadyCheckAnswer} from '../commands/readycheck';
import {handleGenericPollAnswer, isActiveGenericPoll} from './service';

export async function onPollAnswer(ctx: Filter<BotContext, 'poll_answer'>) {
  const {poll_id, user, option_ids} = ctx.update.poll_answer;

  if (!user) {
    return;
  }

  if (await isActiveGenericPoll(poll_id)) {
    await handleGenericPollAnswer(ctx.api, poll_id, user, option_ids);
    return;
  }

  await onReadyCheckAnswer(ctx);
}
