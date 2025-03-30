const { hideLinkEmbed, PermissionsBitField, PermissionFlagsBits } = require('discord.js');

const getFormattedMessage = message => {
  const [command, ...rest] = message.content.split(' ');

  return {
    command: command.replace('/', ''),
    content: rest.join(' ')
  };
};

const hideLinkEmbeds = message => {
  const result = message.replaceAll(/(http.*)/gi, substring => {
    const embedSafe = hideLinkEmbed(substring.replaceAll(')', '').replaceAll(' ', ''));
    const parenthesisCount = substring.match(/\)/gi)?.length || 0;

    return `${embedSafe}${')'.repeat(parenthesisCount)}`;
  });

  return result;
};

const getUserTypes = (user, member) => {
  const permissions = new PermissionsBitField(BigInt(PermissionFlagsBits.Administrator));
  const isAdmin = member.permissions.has(permissions);
  const isOwner = process.env.ADMIN_ID === user.id;
  const isBot = user.bot;

  return {
    isOwner,
    isAdmin,
    isBot
  };
};

const DISCORD_MAX_LENGTH = 4000;

module.exports = {
  DISCORD_MAX_LENGTH,
  getUserTypes,
  getFormattedMessage,
  hideLinkEmbeds
};
