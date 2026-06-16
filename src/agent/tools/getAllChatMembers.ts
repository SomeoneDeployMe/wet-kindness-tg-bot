import {z} from 'zod';
import {configStore} from '../../store';

export async function getAllChatMembers() {
  return configStore
    .getPlayingMembers()
    .map((member) => `@${member.tgName}`)
    .join(', ');
}

export const allChatMembersToolDefinition = {
  name: 'get_the_names_of_all_chat_member',
  type: 'function',
  description: 'returns the names of all chat members',
  parameters: z.object({}),
};
