import {
  addMessage,
  getMemoryLength,
  getMessages,
  truncateMemory,
} from './memory';
import {runModel} from './llm';
import {runner} from './tools/runner';
import {randomChatMemberToolDefinition} from './tools/getRandomChatMember';
import {allChatMembersToolDefinition} from './tools/getAllChatMembers';
import {createPollToolDefinition} from './tools/createPoll';
import {closePollToolDefinition} from './tools/closePoll';
import {AGENT_FALLBACK_MESSAGE} from './fallback';
import {AgentContext} from './context';

const MAX_AGENT_ITERATIONS = 10;

function fail(snapshotLength: number): string {
  truncateMemory(snapshotLength);
  return AGENT_FALLBACK_MESSAGE;
}

export async function runAgent(message: string, context?: AgentContext) {
  const snapshotLength = getMemoryLength();
  addMessage({role: 'user', content: message});

  try {
    for (let iteration = 0; iteration < MAX_AGENT_ITERATIONS; iteration++) {
      const messages = getMessages();

      const response = await runModel({
        messages,
        tools: [
          randomChatMemberToolDefinition,
          allChatMembersToolDefinition,
          createPollToolDefinition,
          closePollToolDefinition,
        ],
      });

      if (!response) {
        return fail(snapshotLength);
      }

      addMessage(response);

      if (response.tool_calls) {
        console.log('Calling tool');

        const toolCall = response.tool_calls[0];

        const toolResponse = await runner(toolCall, context);

        addMessage({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: toolResponse,
        });
      }

      if (response.content != null && response.tool_calls == null) {
        return response.content;
      }
    }

    return fail(snapshotLength);
  } catch (err) {
    console.error('Agent error:', err);
    return fail(snapshotLength);
  }
}
