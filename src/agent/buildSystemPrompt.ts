import {getMoscowDateLine} from '../initiative/time';

export function buildSystemPrompt(staticSystem: string): string {
  return `${getMoscowDateLine()}\n\n${staticSystem}`;
}
