import OpenAI from 'openai';
import {getRandomChatMember} from './getRandomChatMember';
import {getAllChatMembers} from './getAllChatMembers';

export async function runner(
  toolCall: OpenAI.Chat.Completions.ChatCompletionMessageToolCall
) {
  switch (toolCall.function.name) {
    case 'get_random_chat_member':
      return getRandomChatMember();
    case 'get_the_names_of_all_chat_member':
      return getAllChatMembers();
    default:
      return 'Unknown tool call';
  }
}
