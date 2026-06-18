import {Api, GrammyError} from 'grammy';
import type {MessageEntity} from 'grammy/types';
import {markdownToFormattable} from '@gramio/format/markdown';
import {stripMarkdown} from './stripMarkdown';

type SendAgentMessageOptions = {
  reply_to_message_id?: number;
};

function isEntityParseError(error: unknown): boolean {
  return (
    error instanceof GrammyError &&
    error.description.toLowerCase().includes("can't parse entities")
  );
}

export async function sendAgentMessage(
  api: Api,
  chatId: number,
  text: string,
  options?: SendAgentMessageOptions
) {
  const plainText = stripMarkdown(text);

  let formatted;

  try {
    formatted = markdownToFormattable(text);
  } catch (error) {
    console.warn('Agent message markdown conversion failed, sending plain text:', error);
    await api.sendMessage(chatId, plainText, options);
    return;
  }

  try {
    await api.sendMessage(chatId, formatted.text, {
      entities: formatted.entities as MessageEntity[],
      ...options,
    });
  } catch (error) {
    if (isEntityParseError(error)) {
      console.warn('Agent message entity parse failed, sending plain text:', error);
      await api.sendMessage(chatId, plainText, options);
      return;
    }

    throw error;
  }
}
