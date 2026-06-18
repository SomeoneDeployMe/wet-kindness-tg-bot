import OpenAI from 'openai';
import {AgentContext} from '../context';
import {getRandomChatMember} from './getRandomChatMember';
import {getAllChatMembers} from './getAllChatMembers';
import {createPoll, createPollParams} from './createPoll';
import {closePoll, closePollParams} from './closePoll';
import {webSearch, webSearchParams} from './webSearch';

export async function runner(
  toolCall: OpenAI.Chat.Completions.ChatCompletionMessageToolCall,
  context?: AgentContext
) {
  if (toolCall.type !== 'function') {
    return 'Unknown tool call';
  }

  switch (toolCall.function.name) {
    case 'get_random_chat_member':
      return getRandomChatMember();
    case 'get_the_names_of_all_chat_member':
      return getAllChatMembers();
    case 'create_poll': {
      const args = createPollParams.parse(JSON.parse(toolCall.function.arguments));
      return createPoll(args, context);
    }
    case 'close_poll': {
      const args = closePollParams.parse(JSON.parse(toolCall.function.arguments));
      return closePoll(args, context);
    }
    case 'web_search': {
      const args = webSearchParams.parse(JSON.parse(toolCall.function.arguments));
      return webSearch(args);
    }
    default:
      return 'Unknown tool call';
  }
}
