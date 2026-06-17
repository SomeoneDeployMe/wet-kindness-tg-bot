import {Api} from 'grammy';
import {
  ICEBREAKER_COOLDOWN_MAX_HOURS,
  ICEBREAKER_COOLDOWN_MIN_HOURS,
  SILENCE_MAX_HOURS,
  SILENCE_MIN_HOURS,
} from './constants';

type SilenceHandler = (chatId: number, api: Api) => Promise<void>;

type ChatSilenceState = {
  timeout: NodeJS.Timeout;
  api: Api;
};

const chatStates = new Map<number, ChatSilenceState>();
let silenceHandler: SilenceHandler | null = null;

export function setSilenceHandler(handler: SilenceHandler) {
  silenceHandler = handler;
}

function randomHours(minHours: number, maxHours: number): number {
  return Math.random() * (maxHours - minHours) + minHours;
}

function hoursToMs(hours: number): number {
  return hours * 60 * 60 * 1000;
}

export function recordActivity(
  chatId: number,
  api: Api,
  options?: {afterIcebreaker?: boolean}
) {
  const existing = chatStates.get(chatId);

  if (existing) {
    clearTimeout(existing.timeout);
  }

  const minHours = options?.afterIcebreaker
    ? ICEBREAKER_COOLDOWN_MIN_HOURS
    : SILENCE_MIN_HOURS;
  const maxHours = options?.afterIcebreaker
    ? ICEBREAKER_COOLDOWN_MAX_HOURS
    : SILENCE_MAX_HOURS;
  const delayMs = hoursToMs(randomHours(minHours, maxHours));

  const timeout = setTimeout(() => {
    chatStates.delete(chatId);

    if (silenceHandler) {
      void silenceHandler(chatId, api).catch((err) => {
        console.error('Icebreaker error:', err);
      });
    }
  }, delayMs);

  chatStates.set(chatId, {timeout, api});
}
