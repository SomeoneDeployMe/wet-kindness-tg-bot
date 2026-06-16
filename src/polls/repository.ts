import {getClient} from '../db';
import {Poll, PollAnswer, PollStatus} from './types';

type PollRow = {
  id: number;
  telegram_poll_id: string;
  chat_id: number;
  message_id: number;
  question: string;
  poll_type: string;
  options_json: string;
  completion_rule: string;
  threshold_yes: number | null;
  close_on_complete: number;
  status: string;
  created_at: string;
  expires_at: string;
  completed_at: string | null;
};

function mapPollRow(row: PollRow): Poll {
  return {
    id: row.id,
    telegramPollId: row.telegram_poll_id,
    chatId: row.chat_id,
    messageId: row.message_id,
    question: row.question,
    pollType: row.poll_type,
    options: JSON.parse(row.options_json) as string[],
    completionRule: row.completion_rule as Poll['completionRule'],
    thresholdYes: row.threshold_yes,
    closeOnComplete: row.close_on_complete === 1,
    status: row.status as PollStatus,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    completedAt: row.completed_at,
  };
}

export type InsertPollParams = {
  telegramPollId: string;
  chatId: number;
  messageId: number;
  question: string;
  options: string[];
  completionRule: Poll['completionRule'];
  thresholdYes: number | null;
  closeOnComplete: boolean;
  createdAt: string;
  expiresAt: string;
};

export async function insertPoll(params: InsertPollParams): Promise<Poll> {
  const result = await getClient().execute({
    sql: `INSERT INTO polls (
      telegram_poll_id, chat_id, message_id, question, poll_type, options_json,
      completion_rule, threshold_yes, close_on_complete, status, created_at, expires_at
    ) VALUES (?, ?, ?, ?, 'generic', ?, ?, ?, ?, 'active', ?, ?)`,
    args: [
      params.telegramPollId,
      params.chatId,
      params.messageId,
      params.question,
      JSON.stringify(params.options),
      params.completionRule,
      params.thresholdYes,
      params.closeOnComplete ? 1 : 0,
      params.createdAt,
      params.expiresAt,
    ],
  });

  const poll = await getPollById(Number(result.lastInsertRowid));

  if (!poll) {
    throw new Error('Failed to load poll after insert');
  }

  return poll;
}

export async function getPollById(id: number): Promise<Poll | null> {
  const result = await getClient().execute({
    sql: 'SELECT * FROM polls WHERE id = ?',
    args: [id],
  });

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return mapPollRow(row as unknown as PollRow);
}

export async function getPollByTelegramPollId(
  telegramPollId: string
): Promise<Poll | null> {
  const result = await getClient().execute({
    sql: 'SELECT * FROM polls WHERE telegram_poll_id = ?',
    args: [telegramPollId],
  });

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return mapPollRow(row as unknown as PollRow);
}

export async function loadActivePolls(): Promise<Poll[]> {
  const result = await getClient().execute(
    "SELECT * FROM polls WHERE status = 'active'"
  );

  return result.rows.map((row) => mapPollRow(row as unknown as PollRow));
}

export async function loadActivePollsByChatId(chatId: number): Promise<Poll[]> {
  const result = await getClient().execute({
    sql: "SELECT * FROM polls WHERE status = 'active' AND chat_id = ? ORDER BY created_at DESC",
    args: [chatId],
  });

  return result.rows.map((row) => mapPollRow(row as unknown as PollRow));
}

export async function updatePollStatus(
  pollId: number,
  status: PollStatus,
  completedAt: string | null = null
) {
  await getClient().execute({
    sql: 'UPDATE polls SET status = ?, completed_at = ? WHERE id = ?',
    args: [status, completedAt, pollId],
  });
}

export async function upsertPollAnswer(answer: Omit<PollAnswer, 'pollId'> & {pollId: number}) {
  await getClient().execute({
    sql: `INSERT INTO poll_answers (poll_id, telegram_user_id, option_index, display_name, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (poll_id, telegram_user_id) DO UPDATE SET
        option_index = excluded.option_index,
        display_name = excluded.display_name,
        updated_at = excluded.updated_at`,
    args: [
      answer.pollId,
      answer.telegramUserId,
      answer.optionIndex,
      answer.displayName,
      answer.updatedAt,
    ],
  });
}

export async function deletePollAnswer(pollId: number, telegramUserId: number) {
  await getClient().execute({
    sql: 'DELETE FROM poll_answers WHERE poll_id = ? AND telegram_user_id = ?',
    args: [pollId, telegramUserId],
  });
}

export async function getPollAnswers(pollId: number): Promise<PollAnswer[]> {
  const result = await getClient().execute({
    sql: `SELECT poll_id, telegram_user_id, option_index, display_name, updated_at
      FROM poll_answers WHERE poll_id = ?`,
    args: [pollId],
  });

  return result.rows.map((row) => ({
    pollId: Number(row.poll_id),
    telegramUserId: Number(row.telegram_user_id),
    optionIndex: Number(row.option_index),
    displayName: row.display_name as string,
    updatedAt: row.updated_at as string,
  }));
}
