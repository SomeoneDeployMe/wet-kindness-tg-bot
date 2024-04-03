import {CommandContext} from 'grammy';
import {BotContext} from '../types';
import {Filter} from 'grammy/out/filter';
import {User} from 'grammy/types';
import {CHAT_MEMBERS} from '../consts';

type Answer = {
  user: User;
  optionIds: number[];
};
type PollResult = Record<string, string[]>;

class PollStorage {
  readonly #chatId: number | null = null;

  readonly #pollId: string | null = null;

  readonly #answers: Answer[] = [];

  constructor(chatId: number, pollId: string) {
    this.#chatId = chatId;
    this.#pollId = pollId;
  }

  get chatId() {
    return this.#chatId;
  }

  get pollId() {
    return this.#pollId;
  }

  get answers() {
    return this.#answers;
  }

  get answersCount() {
    return this.#answers.length;
  }

  addAnswer(answer: Answer) {
    this.#answers.push(answer);
  }
}

let activePoll: PollStorage | null;

export async function readycheck(ctx: CommandContext<BotContext>) {
  const pollMessage = await ctx.api.sendPoll(
    ctx.chat.id,
    'Играем в дотан сегодня?',
    ['Да (я уже смешарик)', 'Нет (слился)', 'Не знаю (я нерешительная мямля)'],
    {
      type: 'regular',
      is_anonymous: false,
      allows_multiple_answers: false,
      protect_content: true,
    }
  );

  activePoll = new PollStorage(ctx.chat.id, pollMessage.poll.id);
}

export async function onReadyCheckAnswer(
  ctx: Filter<BotContext, 'poll_answer'>
) {
  console.log(ctx);
  if (activePoll && activePoll.pollId === ctx.update.poll_answer.poll_id) {
    const {user, option_ids} = ctx.update.poll_answer;

    if (user) {
      activePoll.addAnswer({user, optionIds: option_ids});

      if (
        activePoll.answersCount === CHAT_MEMBERS.length &&
        activePoll.chatId
      ) {
        const results = activePoll.answers.reduce<PollResult>((acc, curr) => {
          if (!acc[curr.optionIds[0]]) {
            acc[curr.optionIds[0]] = [];
          }

          acc[curr.optionIds[0]].push(
            [curr.user.first_name, curr.user.last_name]
              .filter(Boolean)
              .join(' ')
          );

          return acc;
        }, {});
        const message =
          'Окей, на сегодня у нас:\n\n' +
          `<b>Смешарики:</b> ${results[0]?.join(', ') ?? '0'}\n` +
          `<b>Сливы:</b> ${results[1]?.join(', ') ?? '0'}\n` +
          `<b>Мямли:</b> ${results[2]?.join(', ') ?? '0'}`;
        await ctx.api.sendMessage(activePoll.chatId, message, {
          parse_mode: 'HTML',
        });
      }
    }
  }
}
