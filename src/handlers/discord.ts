import type { Message, GuildMember } from 'discord.js';
import type { Discord } from '../services';
import type { DiscordInteraction } from '../types';

import { Emitter, Cache, logger } from '../services';
import { EVENTS } from '../config/constants';
import { getCommandHandler } from '../services/helpers/discord-commands';
import { getUserTypes } from './helpers/discord';
import { handleResponseLoading, handleInteractionReply } from './helpers/openai-interaction';

const handler = ({ discord }: { discord: Discord }) => {
  Emitter.on(EVENTS.DISCORD_READY, async () => {
    if (!discord.client?.isReady()) {
      throw new Error(`${EVENTS.DISCORD_READY} - Discord client not ready`);
    }
  });

  // Emitter.on(EVENTS.DISCORD_MESSAGE_CREATED, async ({ message }: { message: Message }) => {
  //   const { isOwner, isAdmin, isBot } = getUserTypes(message.author, message.member);
  //   if (isBot) return;
  //   const { command, content } = getFormattedMessage(message);
  //   const commandHandler = getCommandHandler(command, { isOwner, isAdmin });

  //   if (!commandHandler) return;
  //   logger.log('Processing message by user: ', {
  //     name: message.author.displayName,
  //     isAdmin,
  //     isOwner,
  //     command,
  //     content
  //   });

  //   message.content = content;
  //   await commandHandler(message, { isOwner, isAdmin });
  // });

  Emitter.on(EVENTS.DISCORD_INTERACTION_CREATED, async ({ interaction }: { interaction: DiscordInteraction }) => {
    const { isOwner, isAdmin, isBot } = getUserTypes(interaction.user, interaction.member);

    if (isBot) return;
    const command = interaction.commandName;
    const content = interaction.options.get('input')?.value as string;
    const image = interaction.options.get('image')?.attachment?.url;
    const commandHandler = getCommandHandler(command, { isOwner, isAdmin });

    if (!commandHandler || !content) {
      await interaction.reply('Interaction not allowed');
      return;
    }

    const user = (interaction.member as GuildMember)?.nickname ?? interaction.user.displayName;
    const guildId = interaction.guildId || interaction.user?.id;
    logger.log('Processing Interaction by User:', {
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

      const previousResponseId = guildId ? Cache.getCache<string>(guildId) : undefined;

      const { id, response } = (await commandHandler(interaction, { previousResponseId, user })) as unknown as {
        id: string;
        response: string;
      };

      clearInterval(interval);

      if (guildId) {
        Cache.setCache(guildId, id, 300);
      }

      logger.log('OpenAI Interaction Response:', {
        user,
        responseLength: response.length
      });

      await handleInteractionReply(interaction, user, content, response);
    } catch (err) {
      clearInterval(interval);
      throw err;
    }
  });
};

export default handler;
