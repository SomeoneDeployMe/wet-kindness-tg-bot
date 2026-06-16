import {z} from 'zod';
import {AgentContext} from '../context';
import {closeActivePollInChat} from '../../polls/service';

export const closePollParams = z.object({
  question: z.string().nullable().optional(),
});

export const closePollToolDefinition = {
  name: 'close_poll',
  type: 'function',
  description:
    'Closes an active poll in the current chat, posts a vote summary, and stops voting. Use when the user asks to close or finish a poll — even if the yes-vote threshold was not reached.',
  parameters: closePollParams,
};

export async function closePoll(
  args: z.infer<typeof closePollParams>,
  context?: AgentContext
) {
  if (!context) {
    return 'Cannot close poll: Telegram context is not available';
  }

  try {
    const result = await closeActivePollInChat(
      context.api,
      context.chatId,
      args.question ?? undefined
    );

    if (!result.ok) {
      return result.message;
    }

    return `Poll closed: "${result.poll.question}"`;
  } catch (err) {
    console.error('close_poll tool error:', err);
    return 'Failed to close poll';
  }
}
