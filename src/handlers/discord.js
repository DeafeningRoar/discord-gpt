const { PermissionFlagsBits, PermissionsBitField, Message, Interaction, hideLinkEmbed } = require('discord.js');

const { Emitter } = require('../services');
const { EVENTS } = require('../config/constants');
const { getCommandHandler } = require('../services/helpers/discord-commands');
const Discord = require('../services/discord');
const { formatResponseMessage, getFormattedMessage } = require('./helpers');

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
      console.log('Processing message by user: ', {
        name: message.author.displayName,
        isAdmin,
        isOwner,
        command,
        content
      });

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
      console.log('Processing interaction by user: ', {
        name: interaction.user.displayName,
        isAdmin,
        isOwner,
        command,
        content
      });

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
