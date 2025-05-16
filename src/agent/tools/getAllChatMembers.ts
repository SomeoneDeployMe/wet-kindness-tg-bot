import {z} from 'zod';
import {supabase} from '../../supabase';

export async function getAllChatMembers() {
  const response = await supabase.from('users').select('tg_name');
  const names = response.data?.map((user) => user.tg_name) ?? [];

  return names.map((name) => `@${name}`).join(', ');
}

export const allChatMembersToolDefinition = {
  name: 'get_the_names_of_all_chat_member',
  type: 'function',
  description: 'returns the names of all chat members',
  parameters: z.object({}),
};
