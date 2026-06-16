export type PromptType = 'SYSTEM' | 'MID' | 'POLL_OPTIONS';

export type Member = {
  id: number;
  tgName: string;
  name: string;
  telegramUserId: number | null;
  active: boolean;
  plays: boolean;
};

class ConfigStoreImpl {
  #prompts: Map<PromptType, string> = new Map();
  #members: Member[] = [];

  get prompts() {
    return this.#prompts;
  }

  set prompts(prompts: Map<PromptType, string> | [PromptType, string][]) {
    if (Array.isArray(prompts)) {
      this.#prompts = new Map(prompts);
    } else {
      this.#prompts = prompts;
    }
  }

  get members(): Member[] {
    return this.#members;
  }

  set members(members: Member[]) {
    this.#members = members;
  }

  getPlayingMembers() {
    return this.#members.filter((member) => member.plays);
  }

  getMemberByTgName(tgName: string) {
    return this.#members.find((member) => member.tgName === tgName);
  }

  updatePrompt(type: PromptType, newValue: string) {
    this.#prompts.set(type, newValue);
  }

  getPromptByType(type: PromptType) {
    return this.#prompts.get(type)!;
  }
}

export const configStore = new ConfigStoreImpl();
