export type PollStatus = 'active' | 'completed' | 'expired';

export type CompletionRule = 'threshold_yes' | 'none';

export type Poll = {
  id: number;
  telegramPollId: string;
  chatId: number;
  messageId: number;
  question: string;
  pollType: string;
  options: string[];
  completionRule: CompletionRule;
  thresholdYes: number | null;
  closeOnComplete: boolean;
  status: PollStatus;
  createdAt: string;
  expiresAt: string;
  completedAt: string | null;
};

export type PollAnswer = {
  pollId: number;
  telegramUserId: number;
  optionIndex: number;
  displayName: string;
  updatedAt: string;
};

export type CreateGenericPollParams = {
  question: string;
  thresholdYes?: number;
  closeOnComplete?: boolean;
};
