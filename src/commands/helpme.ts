import {BotContext} from '../types';
import {CommandContext} from 'grammy';

const helpmeMessage =
  'Может принимать команды:\n\n' +
  '<a>/dota</a> - Позвать мужиков сыграть партейку. Принимает в качестве параметра количество минут на подготовку;\n' +
  '<a>/mid</a> - Проклять бездаря и отправить его на мид;\n' +
  '<a>/slap</a> - Дать крепкого леща товарищу (если попадёшь, конечно);\n' +
  '<a>/spit</a> - Оскорбительно харкнуть в несогласного с твоим мнением;\n\n' +
  '...а также ставить реакции под определёнными сообщениями';

export async function helpme(ctx: CommandContext<BotContext>) {
  await ctx.reply(helpmeMessage, {parse_mode: 'HTML'});
}
