import {z} from 'zod';
import {AgentContext} from '../context';
import {createGenericPoll} from '../../polls/service';

export const createPollParams = z.object({
  question: z.string().max(300),
  threshold_yes: z.number().int().min(1).nullable().optional(),
  close_on_complete: z.boolean().nullable().optional(),
});

export const createPollToolDefinition = {
  name: 'create_poll',
  type: 'function',
  description:
    'Creates a non-anonymous poll in the current chat with fixed options Да, Нет, Может быть. Use when the user asks to create a poll or vote on something.',
  parameters: createPollParams,
};

export async function createPoll(
  args: z.infer<typeof createPollParams>,
  context?: AgentContext
) {
  if (!context) {
    return 'Cannot create poll: Telegram context is not available';
  }

  try {
    const poll = await createGenericPoll(context.api, context.chatId, {
      question: args.question,
      thresholdYes: args.threshold_yes ?? undefined,
      closeOnComplete: args.close_on_complete ?? undefined,
    });

    const thresholdPart =
      poll.thresholdYes != null ? ` (need ${poll.thresholdYes} yes votes)` : '';

    return `Poll created: "${poll.question}"${thresholdPart}`;
  } catch (err) {
    console.error('create_poll tool error:', err);
    return 'Failed to create poll';
  }
}
