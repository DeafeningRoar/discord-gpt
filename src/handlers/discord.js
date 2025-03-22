const { PermissionFlagsBits, PermissionsBitField, Message, Interaction, hideLinkEmbed } = require('discord.js');

const { Emitter } = require('../services');
const { EVENTS } = require('../config/constants');
const { getCommandHandler } = require('../services/helpers/discord-commands');
const Discord = require('../services/discord');
const Channels = require('../database/channels');

const channelsDB = new Channels();

const getFormattedMessage = message => {
  const [command, ...rest] = message.content.split(' ');

  return {
    command: command.replace('/', ''),
    content: rest.join(' ')
  };
};

const formatResponseMessage = message => {
  const result = message.replaceAll(/\((\http.*)\)\)/gi, (substring, captureGroup) => {
    console.log({ substring, captureGroup });
    return `(${hideLinkEmbed(captureGroup)}))`;
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

/**
 * @param {Object} params
 * @param {Discord} params.discord
 */
module.exports = ({ discord }) => {
  Emitter.on(EVENTS.DISCORD_READY, async () => {
    if (!discord.client?.isReady?.()) {
      throw new Error(`${EVENTS.DISCORD_READY} - Discord client not ready`);
    }

    const dbChannels = await channelsDB.find([]);
    if (!dbChannels.length) {
      console.log('No channels registered');
      return;
    }

    console.log(
      'Registered channels:',
      dbChannels.map(({ channelId, guildId }) => ({ guildId, channelId }))
    );
  });

  Emitter.on(
    EVENTS.DISCORD_MESSAGE_CREATED,
    /**
     * @param {object} param
     * @param {Message} param.message
     */
    async ({ message }) => {
      const { isOwner, isAdmin, isBot } = getUserTypes(message.author, message.member);
      if (isBot) return;

      const { command, content } = getFormattedMessage(message);
      const commandHandler = getCommandHandler(command, { isOwner, isAdmin });

      if (!commandHandler) return;

      message.content = content;
      await commandHandler(message, { isOwner, isAdmin });
    }
  );

  Emitter.on(
    EVENTS.DISCORD_INTERACTION_CREATED,
    /**
     * @param {object} param
     * @param {Interaction} param.interaction
     */
    async ({ interaction }) => {
      const { isOwner, isAdmin, isBot } = getUserTypes(interaction.user, interaction.member);

      if (isBot) return;
      const command = interaction.commandName;
      const content = interaction.options.get('input').value;
      const commandHandler = getCommandHandler(command, { isOwner, isAdmin });

      if (!commandHandler) return;

      let interval;
      let resultMessage = `\`${content}\``;
      interaction.content = content;

      try {
        await interaction.reply(resultMessage + '\n。');

        let dots = 2;
        interval = setInterval(async () => {
          if (dots > 3) dots = 1;
          await interaction.editReply(`${resultMessage}\n` + '。'.repeat(dots));
          dots++;
        }, 850);

        const response = await commandHandler(interaction, { isOwner, isAdmin });
        clearInterval(interval);

        await interaction.editReply(`${resultMessage}\n\n${formatResponseMessage(response)}`);
      } catch (err) {
        clearInterval(interval);
        throw err;
      }
    }
  );
};
