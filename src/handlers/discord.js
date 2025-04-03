const { Message, Interaction } = require('discord.js');

const { Emitter, Discord, Cache } = require('../services');
const { EVENTS } = require('../config/constants');
const { getCommandHandler } = require('../services/helpers/discord-commands');
const { getFormattedMessage, getUserTypes } = require('./helpers');
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
      const image = interaction.options.get('image')?.attachment?.url;
      const commandHandler = getCommandHandler(command, { isOwner, isAdmin });

      if (!commandHandler) {
        await interaction.reply('Interaction not allowed');
        return;
      }

      const user = interaction.member?.nickname ?? interaction.user.displayName;
      const guildId = interaction.guildId || interaction.user?.id;
      console.log(new Date().toISOString(), '- Processing Interaction by User:', {
        user,
        guildName: interaction?.guild?.name || null,
        isDirectMessage: !interaction.guildId,
        isAdmin,
        isOwner,
        command,
        queryLength: content.length,
        hasImage: !!image,
        content
      });

      let interval;
      try {
        interaction.content = content;
        interaction.img = image;

        interval = await handleResponseLoading(interaction, user, content, image);

        const previousResponseId = guildId ? Cache.getCache(guildId) : null;

        const { id, response } = await commandHandler(interaction, { previousResponseId, user });

        clearInterval(interval);

        if (guildId) {
          Cache.setCache(guildId, id, 300);
        }

        console.log(new Date().toISOString(), '- OpenAI Interaction Response:', {
          user,
          responseLength: response.length
        });

        await handleInteractionReply(interaction, user, content, response);
      } catch (err) {
        clearInterval(interval);
        throw err;
      }
    }
  );
};
