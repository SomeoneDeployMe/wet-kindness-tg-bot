import {Api} from 'grammy';
import {User} from 'grammy/types';
import {
  GENERIC_POLL_OPTIONS,
  POLL_OPTION_MAYBE,
  POLL_OPTION_YES,
  POLL_TTL_MS,
} from './constants';
import {
  getPollFromCache,
  loadPollsIntoCache,
  removePollFromCache,
  setPollInCache,
} from './cache';
import {
  deletePollAnswer,
  getPollAnswers,
  getPollByTelegramPollId,
  insertPoll,
  updatePollStatus,
  upsertPollAnswer,
  loadActivePolls,
  loadActivePollsByChatId,
} from './repository';
import {CreateGenericPollParams, Poll} from './types';

function nowIso() {
  return new Date().toISOString();
}

function isExpired(poll: Poll) {
  return new Date(poll.expiresAt).getTime() <= Date.now();
}

function formatDisplayName(user: User) {
  return [user.first_name, user.last_name].filter(Boolean).join(' ');
}

function buildSummaryMessage(poll: Poll, answers: Awaited<ReturnType<typeof getPollAnswers>>) {
  const yesNames = answers
    .filter((answer) => answer.optionIndex === POLL_OPTION_YES)
    .map((answer) => answer.displayName);

  const maybeNames = answers
    .filter((answer) => answer.optionIndex === POLL_OPTION_MAYBE)
    .map((answer) => answer.displayName);

  const header =
    poll.thresholdYes != null
      ? `Набрались (${yesNames.length}/${poll.thresholdYes}):`
      : 'Набрались:';

  let message = `${header}\n${yesNames.join(', ') || 'никто'}`;

  if (maybeNames.length > 0) {
    message += `\n\nМожет быть: ${maybeNames.join(', ')}`;
  }

  return message;
}

async function completePoll(api: Api, poll: Poll, stopPoll: boolean) {
  const answers = await getPollAnswers(poll.id);

  if (stopPoll) {
    try {
      await api.stopPoll(poll.chatId, poll.messageId);
    } catch (err) {
      console.error(`Failed to stop poll ${poll.telegramPollId}:`, err);
    }
  }

  const summary = buildSummaryMessage(poll, answers);

  await api.sendMessage(poll.chatId, summary, {
    reply_to_message_id: poll.messageId,
  });

  await updatePollStatus(poll.id, 'completed', nowIso());
  removePollFromCache(poll.telegramPollId);
}

export async function closeActivePollInChat(
  api: Api,
  chatId: number,
  question?: string
) {
  let polls = await loadActivePollsByChatId(chatId);

  if (polls.length === 0) {
    return {ok: false as const, message: 'No active poll in this chat'};
  }

  if (question) {
    const query = question.toLowerCase();
    polls = polls.filter((poll) => poll.question.toLowerCase().includes(query));

    if (polls.length === 0) {
      return {ok: false as const, message: 'No active poll matching that topic'};
    }

    if (polls.length > 1) {
      return {
        ok: false as const,
        message: 'Multiple active polls match — ask user to be more specific',
      };
    }
  }

  const poll = polls[0];
  await completePoll(api, poll, true);

  return {ok: true as const, poll};
}

export async function createGenericPoll(
  api: Api,
  chatId: number,
  params: CreateGenericPollParams
) {
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + POLL_TTL_MS).toISOString();
  const completionRule = params.thresholdYes != null ? 'threshold_yes' : 'none';

  const pollMessage = await api.sendPoll(
    chatId,
    params.question,
    [...GENERIC_POLL_OPTIONS],
    {
      type: 'regular',
      is_anonymous: false,
      allows_multiple_answers: false,
    }
  );

  const poll = await insertPoll({
    telegramPollId: pollMessage.poll.id,
    chatId,
    messageId: pollMessage.message_id,
    question: params.question,
    options: [...GENERIC_POLL_OPTIONS],
    completionRule,
    thresholdYes: params.thresholdYes ?? null,
    closeOnComplete: params.closeOnComplete ?? false,
    createdAt,
    expiresAt,
  });

  setPollInCache(poll);

  return poll;
}

export async function expirePoll(api: Api, poll: Poll) {
  if (poll.status !== 'active') {
    removePollFromCache(poll.telegramPollId);
    return;
  }

  try {
    await api.stopPoll(poll.chatId, poll.messageId);
  } catch (err) {
    console.error(`Failed to stop poll ${poll.telegramPollId}:`, err);
  }

  await updatePollStatus(poll.id, 'expired');
  removePollFromCache(poll.telegramPollId);
}

export async function evaluateCompletion(api: Api, poll: Poll) {
  if (
    poll.status !== 'active' ||
    poll.completionRule !== 'threshold_yes' ||
    poll.thresholdYes == null
  ) {
    return;
  }

  const answers = await getPollAnswers(poll.id);
  const yesCount = answers.filter(
    (answer) => answer.optionIndex === POLL_OPTION_YES
  ).length;

  if (yesCount < poll.thresholdYes) {
    return;
  }

  await completePoll(api, poll, poll.closeOnComplete);
}

export async function upsertAnswer(
  api: Api,
  poll: Poll,
  user: User,
  optionIds: number[]
) {
  const optionIndex = optionIds[0];

  if (optionIndex == null) {
    await deletePollAnswer(poll.id, user.id);
    await evaluateCompletion(api, poll);
    return;
  }

  await upsertPollAnswer({
    pollId: poll.id,
    telegramUserId: user.id,
    optionIndex,
    displayName: formatDisplayName(user),
    updatedAt: nowIso(),
  });

  const updatedPoll = {...poll};
  setPollInCache(updatedPoll);

  await evaluateCompletion(api, updatedPoll);
}

export async function isActiveGenericPoll(
  telegramPollId: string
): Promise<boolean> {
  const cached = getPollFromCache(telegramPollId);

  if (cached?.status === 'active') {
    return true;
  }

  const loaded = await getPollByTelegramPollId(telegramPollId);

  return loaded?.status === 'active';
}

export async function handleGenericPollAnswer(
  api: Api,
  telegramPollId: string,
  user: User,
  optionIds: number[]
) {
  let poll = getPollFromCache(telegramPollId);

  if (!poll) {
    const loaded = await getPollByTelegramPollId(telegramPollId);

    if (!loaded || loaded.status !== 'active') {
      return;
    }

    poll = loaded;
    setPollInCache(poll);
  }

  if (poll.status !== 'active') {
    return;
  }

  if (isExpired(poll)) {
    await expirePoll(api, poll);
    return;
  }

  await upsertAnswer(api, poll, user, optionIds);
}

export async function initializePolls(api: Api) {
  const activePolls = await loadActivePolls();
  const stillActive: Poll[] = [];

  for (const poll of activePolls) {
    if (isExpired(poll)) {
      await expirePoll(api, poll);
    } else {
      stillActive.push(poll);
    }
  }

  loadPollsIntoCache(stillActive);
}
