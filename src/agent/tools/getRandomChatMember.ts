import {z} from 'zod';
import {configStore} from '../../store';

export async function getRandomChatMember() {
  const playingMembers = configStore.getPlayingMembers();
  const member =
    playingMembers[Math.floor(Math.random() * playingMembers.length)];

  if (!member) {
    return 'No playing members found';
  }

  return `@${member.tgName}`;
}

export const randomChatMemberToolDefinition = {
  name: 'get_random_chat_member',
  type: 'function',
  description:
    "returns the name of a random chat member. name is return as is and musn't be translated to any languages",
  parameters: z.object({}),
};
