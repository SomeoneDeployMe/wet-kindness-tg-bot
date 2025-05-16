import {z} from 'zod';
import {supabase} from '../../supabase';

export async function getRandomChatMember() {
  const response = await supabase.from('users').select('tg_name');
  const names = response.data?.map((user) => user.tg_name) ?? [];

  return `@${names[Math.floor(Math.random() * names.length)]}`;
}

export const randomChatMemberToolDefinition = {
  name: 'get_random_chat_member',
  type: 'function',
  description: 'returns the name of a random chat member',
  parameters: z.object({}),
};
