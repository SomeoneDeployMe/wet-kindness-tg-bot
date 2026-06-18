import {Api} from 'grammy';
import {runAgent} from '../../agent/agent';
import {agentContextFromChat} from '../../agent/context';
import {configStore} from '../../store';
import {isWithinMoscowWindow} from '../time';
import {
  ICEBREAKER_WINDOW_END_HOUR,
  ICEBREAKER_WINDOW_START_HOUR,
} from './constants';
import {recordActivity} from './tracker';
import {sendAgentMessage} from '../../utils';

export async function sendIcebreaker(chatId: number, api: Api) {
  if (
    !isWithinMoscowWindow(
      ICEBREAKER_WINDOW_START_HOUR,
      ICEBREAKER_WINDOW_END_HOUR
    )
  ) {
    console.log('Icebreaker skipped: outside Moscow time window');

    return;
  }

  const prompt = configStore.getPromptByType('ICEBREAKER');
  const text = await runAgent(prompt, agentContextFromChat(chatId, api));

  await sendAgentMessage(api, chatId, text);
  recordActivity(chatId, api, {afterIcebreaker: true});
}
