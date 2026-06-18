import {AIMessage} from './types';
import {openai} from './ai';
import {zodFunction} from 'openai/helpers/zod';
import {configStore} from '../store';
import {buildSystemPrompt} from './buildSystemPrompt';

type RunModelParams = {
  messages: AIMessage[];
  tools: any[];
};

export async function runModel({messages, tools}: RunModelParams) {
  const systemPrompt = buildSystemPrompt(configStore.getPromptByType('SYSTEM')!);

  console.log('Call LLM');

  const response = await openai.chat.completions.create({
    model: process.env.MODEL!,
    reasoning_effort: 'low',
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...messages,
    ],
    parallel_tool_calls: false,
    tools: tools.map(zodFunction),
    tool_choice: 'auto',
  });

  console.log('Got LLM message');

  const message = response.choices[0]?.message;

  if (!message) {
    return null;
  }

  return message;
}
