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
import {webSearchToolDefinition} from './tools/webSearch';
import {AGENT_FALLBACK_MESSAGE} from './fallback';
import {AgentContext} from './context';

const MAX_AGENT_ITERATIONS = 10;
const MAX_WEB_SEARCH_CALLS_PER_RUN = 2;
const SEARCH_LIMIT_REACHED_MESSAGE =
  'SEARCH_LIMIT_REACHED: Maximum 2 web searches per message. Answer from existing context or say you cannot search further.';

const AGENT_TOOLS = [
  randomChatMemberToolDefinition,
  allChatMembersToolDefinition,
  createPollToolDefinition,
  closePollToolDefinition,
  webSearchToolDefinition,
];

function fail(snapshotLength: number): string {
  truncateMemory(snapshotLength);
  return AGENT_FALLBACK_MESSAGE;
}

export async function runAgent(message: string, context?: AgentContext) {
  const snapshotLength = getMemoryLength();
  let searchCallsThisRun = 0;

  addMessage({role: 'user', content: message});

  try {
    for (let iteration = 0; iteration < MAX_AGENT_ITERATIONS; iteration++) {
      const messages = getMessages();

      const response = await runModel({
        messages,
        tools: AGENT_TOOLS,
      });

      if (!response) {
        return fail(snapshotLength);
      }

      addMessage(response);

      if (response.tool_calls) {
        console.log('Calling tool');

        const toolCall = response.tool_calls[0];

        let toolResponse: string;

        if (
          toolCall.type === 'function' &&
          toolCall.function.name === 'web_search'
        ) {
          if (searchCallsThisRun >= MAX_WEB_SEARCH_CALLS_PER_RUN) {
            toolResponse = SEARCH_LIMIT_REACHED_MESSAGE;
          } else {
            searchCallsThisRun++;
            toolResponse = await runner(toolCall, context);
          }
        } else {
          toolResponse = await runner(toolCall, context);
        }

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
