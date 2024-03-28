import {CommandContext} from 'grammy';
import {MessageEntity} from '@grammyjs/types/message';
import {buildHTMLMentionByUserId} from '../utils';
import {BotContext} from '../types';

export const slap = async (ctx: CommandContext<BotContext>) => {
  const regExp = /@\S+/;
  const result = regExp.exec(ctx.match);

  if (result !== null) {
    const targetUserName = result[0];

    ctx.reply(
      `${targetUserName} получает смачного леща от @${ctx.from!.username}`
    );
  } else {
    const ent = ctx.message!.entities.find(
      (entity): entity is MessageEntity.TextMentionMessageEntity =>
        entity.type === 'text_mention'
    );

    if (ent) {
      const {id, first_name} = ent.user;

      ctx.reply(
        `${buildHTMLMentionByUserId(id, first_name)} получает смачного леща от @${ctx.from!.username}`,
        {parse_mode: 'HTML'}
      );
    } else {
      ctx.reply(
        `Трясясь и потея в попытках найти соперника, @${ctx.from!.username} обмякает не преуспев`
      );
    }
  }
};
