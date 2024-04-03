import {Context} from 'grammy';
import type {ChatMembersFlavor} from '@grammyjs/chat-members';

/** Extended with chat-members plugin bot context */
export type BotContext = Context & ChatMembersFlavor;
