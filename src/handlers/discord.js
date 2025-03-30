const { Message, Interaction } = require('discord.js');

const { Emitter } = require('../services');
const { EVENTS } = require('../config/constants');
const { getCommandHandler } = require('../services/helpers/discord-commands');
const Discord = require('../services/discord');
const { getFormattedMessage, getUserTypes, hideLinkEmbeds } = require('./helpers');
const { handleResponseLoading, handleInteractionReply } = require('./helpers/interaction');

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
      const user = interaction.member.nickname;
      console.log(new Date().toISOString(), '- Processing Interaction by User:', {
        user,
        queryLength: content.length,
        isAdmin,
        isOwner,
        command,
        content
      });

      let interval;
      try {
        interaction.content = content;

        interval = await handleResponseLoading(interaction, user, content);

        const response = await commandHandler(interaction, { isOwner, isAdmin });

        clearInterval(interval);

        const responseMessage = hideLinkEmbeds(response);

        console.log(new Date().toISOString(), '- OpenAI Interaction Response:', {
          user,
          responseLength: responseMessage.length
        });

        await handleInteractionReply(interaction, user, content, responseMessage);
      } catch (err) {
        clearInterval(interval);
        throw err;
      }
    }
  );
};
