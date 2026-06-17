import {AIMessage} from './types';

let inactivityTimer: NodeJS.Timeout | null = null;
const memory: {message: AIMessage; timestamp: number}[] = [];

export function addMessage(message: AIMessage) {
  const now = Date.now();

  memory.push({message, timestamp: now});

  if (memory.length > 200) {
    memory.shift();
  }

  resetInactivityTimer();
}

export function getMessages() {
  console.log('Messages memory is', memory.length);

  return memory.map((m) => m.message);
}

export function getMemoryLength() {
  return memory.length;
}

export function truncateMemory(length: number) {
  memory.length = length;
}

function resetInactivityTimer() {
  if (inactivityTimer) clearTimeout(inactivityTimer);

  inactivityTimer = setTimeout(
    () => {
      memory.length = 0;
    },
    1000 * 60 * 60 * 5
  );
}
