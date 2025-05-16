import {addMessage, getMessages} from './memory';
import {runModel} from './llm';
import {runner} from './tools/runner';
import {randomChatMemberToolDefinition} from './tools/getRandomChatMember';
import {allChatMembersToolDefinition} from './tools/getAllChatMembers';

export async function runAgent(message: string) {
  addMessage({role: 'user', content: message});

  while (true) {
    const messages = getMessages();

    const response = await runModel({
      messages,
      tools: [randomChatMemberToolDefinition, allChatMembersToolDefinition],
    });

    addMessage(response);

    if (response.tool_calls) {
      console.log('Calling tool');

      const toolCall = response.tool_calls[0];

      const toolResponse = await runner(toolCall);

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
}
