import {Poll} from './types';

const pollsByTelegramId = new Map<string, Poll>();

export function getPollFromCache(telegramPollId: string) {
  return pollsByTelegramId.get(telegramPollId);
}

export function setPollInCache(poll: Poll) {
  pollsByTelegramId.set(poll.telegramPollId, poll);
}

export function removePollFromCache(telegramPollId: string) {
  pollsByTelegramId.delete(telegramPollId);
}

export function clearPollCache() {
  pollsByTelegramId.clear();
}

export function loadPollsIntoCache(polls: Poll[]) {
  clearPollCache();

  for (const poll of polls) {
    setPollInCache(poll);
  }
}
