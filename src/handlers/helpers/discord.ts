import type { User, GuildMember, APIInteractionGuildMember } from 'discord.js';
import type { DiscordInteraction } from '../../types';

import { hideLinkEmbed, PermissionsBitField, PermissionFlagsBits } from 'discord.js';

const getFormattedMessage = (message: DiscordInteraction) => {
  const [command, ...rest] = message.content.split(' ');

  return {
    command: command.replace('/', ''),
    content: rest.join(' ')
  };
};

const hideLinkEmbeds = (message: string) => {
  const result = message.replaceAll(/(http.*)/gi, substring => {
    const embedSafe = hideLinkEmbed(substring.replaceAll(')', '').replaceAll(' ', ''));
    const parenthesisCount = substring.match(/\)/gi)?.length || 0;

    return `${embedSafe}${')'.repeat(parenthesisCount)}`;
  });

  return result;
};

const getUserTypes = (user: User, member: GuildMember | APIInteractionGuildMember | null) => {
  const permissions = new PermissionsBitField(BigInt(PermissionFlagsBits.Administrator));
  const isAdmin = member ? (member as GuildMember).permissions.has(permissions) : false;
  const isOwner = process.env.ADMIN_ID === user.id;
  const isBot = user.bot;

  return {
    isOwner,
    isAdmin,
    isBot
  };
};

const DISCORD_MAX_LENGTH = 4000;

export { DISCORD_MAX_LENGTH, getUserTypes, getFormattedMessage, hideLinkEmbeds };
