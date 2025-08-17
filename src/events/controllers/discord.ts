import type { GuildMember, TextChannel } from 'discord.js';
import type { Discord } from '../../services';
import type {
  DiscordInteraction,
  DiscordInteractionResponseEvent,
  DiscordCreateMessageEvent,
  DiscordEnrichMessageEvent,
  DiscordProcessingErrorEvent,
  BusinessLogicEvent,
} from '../../../@types';

import { sleep } from '../../utils';
import { Emitter, logger } from '../../services';
import { EVENTS, FIVE_MINUTES_MS, EVENT_SOURCE } from '../../config/constants';
import { DISCORD_CHAT_HISTORY_CACHE, DISCORD_CHAT_HISTORY_CACHE_TTL } from '../../config/env';
import { DiscordCommands } from './helpers/commands';
import { buildUserPrompt, getUserTypes, handleInteractionReply, handleResponseLoading, handleSendMessage } from './helpers/discord';

const handleConnectionError = async (discord: Discord) => {
  logger.log(`Reinitializing Discord in ${FIVE_MINUTES_MS / 5}ms`);
  await sleep(FIVE_MINUTES_MS / 5);
  logger.log('Reinitializing Discord connection');
  await discord.initialize();
};

const handleDiscordReady = async (discord: Discord) => {
  if (!discord.client?.isReady()) {
    throw new Error(`${EVENTS.DISCORD_READY} - Discord client not ready`);
  }
};

const handleProcessingError = (event: DiscordProcessingErrorEvent) => {
  const { processMetadata } = event;
  if (processMetadata?.loadingInterval) {
    clearInterval(processMetadata.loadingInterval);
  };
};

const handleEnrichedMessage = async (event: DiscordEnrichMessageEvent, discord: Discord) => {
  const { data, responseEvent, responseMetadata } = event;
  try {
    const discordClient = discord.client;

    if (!discordClient) {
      logger.error('Error enriching Discord Message: Discord client not available.');
      return;
    }

    const channel = discordClient.channels.cache.get(responseMetadata.targetId);

    if (channel) {
      const guildId = (channel as TextChannel).guildId;

      data.id = guildId;
    }

    const originalResponseEvent = responseEvent;

    Emitter.emit(originalResponseEvent, { ...event, responseEvent: EVENTS.DISCORD_CREATED_MESSAGE });
  } catch (error: unknown) {
    logger.error('Error enriching Discord message', {
      targetId: responseMetadata.targetId,
      ...data,
    });

    throw error;
  }
};

const handleCreatedMessage = async ({ response, responseMetadata }: DiscordCreateMessageEvent, discord: Discord) => {
  const { targetId } = responseMetadata;
  try {
    const discordClient = discord.client;

    if (!discordClient) {
      logger.error('Error creating Discord Message: Discord client not available.', { targetId, response });
      return;
    }

    const channel = discordClient.channels.cache.get(targetId);
    let sendFn;

    if (channel) {
      sendFn = async (message: string) => (channel as TextChannel).send(message);
    } else {
      sendFn = async (message: string) => discordClient.users.send(targetId, message);
    }

    await handleSendMessage(sendFn, response);
  } catch (error: unknown) {
    logger.error('Error creating Discord Message', {
      targetId,
      response,
    });

    throw error;
  }
};

const handleInteractionProcessed = async ({ response, responseMetadata, processMetadata }: DiscordInteractionResponseEvent) => {
  const { interaction, user, query, isEdit } = responseMetadata;
  const { loadingInterval } = processMetadata;

  try {
    logger.info('Interaction processed', { user });

    if (loadingInterval) {
      clearInterval(loadingInterval);
    }

    await handleInteractionReply(interaction, user, query, response, !isEdit);
  } catch (error: unknown) {
    logger.error('Error replying to interaction', { ...interaction.__metadata__, query, response });

    throw error;
  }
};

const handleInteractionCreated = async ({ interaction }: { interaction: DiscordInteraction }) => {
  const { isOwner, isAdmin, isBot } = getUserTypes(interaction.user, interaction.member);

  if (isBot) return;
  const command = interaction.commandName;
  const content = interaction.options.getString('input') || '';
  const image = interaction.options.getAttachment('image');
  const txtFile = interaction.options.getAttachment('txt');
  const user = (interaction.member as GuildMember)?.nickname ?? interaction.user.displayName;
  const userId = interaction.user?.id;
  const guildId = interaction.guildId || interaction.user?.id;
  const guild = interaction?.guild?.name || null;
  const isDM = !interaction.guildId;

  interaction.__metadata__ = {
    user,
    guild,
    isDM,
    isAdmin,
    isOwner,
    command,
    contentLength: content.length,
    hasImage: !!image,
    hasTxtFile: !!txtFile,
  };

  try {
    logger.log('Processing Interaction by User:', interaction.__metadata__);

    if (image) {
      const isImage = image.contentType?.startsWith('image/');

      if (!isImage) {
        await interaction.reply('Interaction not allowed');
        return;
      }
    }

    if (txtFile) {
      const isTxtFile = txtFile.contentType?.startsWith('text/');

      if (!isTxtFile) {
        await interaction.reply('Interaction not allowed');
        return;
      }
    }

    const eventType = DiscordCommands.getDiscordEventType(command, { isOwner, isAdmin });

    if (!eventType) {
      await interaction.reply('Interaction not allowed');
      return;
    }

    interaction.content = content;
    interaction.img = image?.url;
    interaction.txt = txtFile?.url;

    Emitter.emit(EVENTS.DISCORD_INTERACTION_VALIDATED, { eventType, interaction, content, image, user, userId, guildId });
  } catch (error: unknown) {
    logger.error('Error validating interaction', { ...interaction.__metadata__, content });

    throw error;
  }
};

const handleInteractionValidated = async ({
  eventType,
  interaction,
  user,
  userId,
  guildId,
}: {
  eventType: string;
  interaction: DiscordInteraction;
  user: string;
  userId: string;
  guildId: string;
}) => {
  let loadingInterval: NodeJS.Timeout | undefined;

  try {
    loadingInterval = await handleResponseLoading(interaction, user, interaction.content, {
      image: interaction.img,
      txt: interaction.txt,
    });

    Emitter.emit(eventType, {
      data: {
        id: guildId,
        userId: userId,
        name: user,
        input: buildUserPrompt(interaction.user, user, interaction.content, interaction.channelId),
        files: {
          image: interaction.img,
          txt: interaction.txt,
        },
      },
      context: { source: EVENT_SOURCE.DISCORD },
      responseEvent: EVENTS.DISCORD_INTERACTION_PROCESSED,
      errorEvent: EVENTS.DISCORD_PROCESSING_ERROR,
      responseMetadata: {
        query: interaction.content,
        isEdit: true,
        interaction,
        user,
      },
      processMetadata: { loadingInterval },
      cacheStrategy: {
        cacheTTL: Number(DISCORD_CHAT_HISTORY_CACHE_TTL),
        baseCacheKey: DISCORD_CHAT_HISTORY_CACHE,
      },
    } as BusinessLogicEvent);
  } catch (error: unknown) {
    logger.error('Error processing valid interaction:', {
      ...interaction.__metadata__,
      content: interaction.content,
    });

    if (loadingInterval) {
      clearInterval(loadingInterval);
    }

    throw error;
  }
};

export default {
  handleConnectionError,
  handleDiscordReady,
  handleProcessingError,
  handleEnrichedMessage,
  handleCreatedMessage,
  handleInteractionProcessed,
  handleInteractionCreated,
  handleInteractionValidated,
};
