export type PromptType = 'SYSTEM' | 'MID' | 'POLL_OPTIONS';

class ConfigStoreImpl {
  #prompts: Map<PromptType, string> = new Map();
  #users: Map<string, string> = new Map();

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

  get users(): Map<string, string> {
    return this.#users;
  }

  set users(users: [string, string][]) {
    this.#users = new Map<string, string>(users);
  }

  updatePrompt(type: PromptType, newValue: string) {
    this.#prompts.set(type, newValue);
  }

  getPromptByType(type: PromptType) {
    return this.#prompts.get(type)!;
  }
}

export const configStore = new ConfigStoreImpl();
