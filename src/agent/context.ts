import {Api} from 'grammy';

export type AgentContext = {
  chatId: number;
  api: Api;
};

export function agentContextFromChat(chatId: number, api: Api): AgentContext {
  return {chatId, api};
}
