import {BotContext} from '../types';
import {CommandContext} from 'grammy';

const helpmeMessage =
  'Может принимать команды:\n\n' +
  '<a>/dota</a> - Позвать мужиков сыграть партейку. Принимает в качестве параметра количество минут на подготовку;\n' +
  '<a>/slap</a> - Дать крепкого леща товарищу (если попадёшь, конечно).';

export async function helpme(ctx: CommandContext<BotContext>) {
  await ctx.reply(helpmeMessage, {parse_mode: 'HTML'});
}