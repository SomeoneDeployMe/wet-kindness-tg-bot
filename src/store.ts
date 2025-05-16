export type PromptType = 'SYSTEM' | 'MID' | 'POLL_OPTIONS';

class ConfigStoreImpl {
  #prompts: Map<PromptType, string> = new Map();

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

  getPromptByType(type: PromptType) {
    return this.#prompts.get(type)!;
  }
}

export const configStore = new ConfigStoreImpl();
