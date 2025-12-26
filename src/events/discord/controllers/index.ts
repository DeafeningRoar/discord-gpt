import type { TextChannel } from 'discord.js';
import type { Discord } from '../../../integrations';
import type {
  DiscordInteraction,
  DiscordMessage,
  DiscordInteractionResponseEvent,
  DiscordCreateMessageEvent,
  DiscordEnrichMessageEvent,
  DiscordProcessingErrorEvent,
  BusinessLogicEvent,
} from '../../../../@types';

import { sleep } from '../../../utils';
import { Emitter, logger } from '../../../services';
import { EVENTS, FIVE_MINUTES_MS, EVENT_SOURCE, PIPELINE_EVENTS } from '../../../config/constants';
import { DISCORD_CHAT_HISTORY_CACHE, DISCORD_CHAT_HISTORY_CACHE_TTL } from '../../../config/env';
import { DiscordCommands } from './helpers/commands';
import { buildUserPrompt, getInteractionContent, getMessageContent, getUserTypes, handleInteractionReply, handleResponseLoading, handleSendMessage } from './helpers/discord';

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
  const { targetId, attachments } = responseMetadata;
  try {
    const discordClient = discord.client;

    if (!discordClient) {
      logger.error('Error creating Discord Message: Discord client not available.', { targetId, response });
      return;
    }

    const channel = discordClient.channels.cache.get(targetId);
    let sendFn;

    if (channel) {
      sendFn = async (message: string) => (channel as TextChannel).send({
        content: message,
        files: attachments?.image ? [{ attachment: attachments.image, name: 'generated-image.png' }] : undefined,
      });
    } else {
      sendFn = async (message: string) => discordClient.users.send(targetId, {
        content: message,
        files: attachments?.image ? [{ attachment: attachments.image, name: 'generated-image.png' }] : undefined,
      });
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

const handleInteractionProcessed = async ({ response, responseMetadata, processMetadata }: DiscordInteractionResponseEvent, discord: Discord) => {
  const { interaction, user, query, isEdit } = responseMetadata;
  const { loadingInterval } = processMetadata;

  try {
    logger.info('Interaction processed', { user });

    if (loadingInterval) {
      clearInterval(loadingInterval);
    }

    if (interaction.eventType === 'interaction') {
      await handleInteractionReply(interaction, user, query, response, !isEdit);
    }

    if (interaction.eventType === 'message') {
      const discordClient = discord.client;
      const channel = discordClient?.channels.cache.get(interaction.channelId);

      if (!discordClient) {
        logger.error('Error creating Discord Message: Discord client not available.', { targetId: interaction.user.id, response });
        return;
      }

      let sendFn;
      if (channel) {
        sendFn = (message: string) => (channel as TextChannel).send(message);
      } else {
        sendFn = (message: string) => discordClient?.users.send(interaction.user.id, { content: message });
      }

      await handleSendMessage(sendFn, response);
    }
  } catch (error: unknown) {
    logger.error('Error replying to interaction', { ...interaction.__metadata__, query, response });

    throw error;
  }
};

const handleInteractionCreated = async ({ interaction, type }: { interaction: DiscordInteraction | DiscordMessage; type: 'message' | 'interaction' }) => {
  if (type === 'message') {
    interaction.eventType = type;
    interaction.user = (interaction as DiscordMessage).author;
  }

  if (type === 'interaction') {
    interaction.eventType = type;
  }

  const { isOwner, isAdmin, isBot } = getUserTypes(
    interaction.user,
    interaction.member,
  );

  if (isBot) return;

  const {
    command,
    content,
    image,
    txtFile,
    user,
    isDM,
    userId,
    guildId,
    guild,
  } = interaction.eventType === 'interaction' ? getInteractionContent(interaction) : getMessageContent(interaction);

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
    let isValidImage = true;

    if (image) {
      const isImage = image.contentType?.startsWith('image/');
      isValidImage = !!isImage;

      if (!isImage && interaction.eventType === 'interaction') {
        await interaction.reply('Interaction not allowed');
        return;
      }
    }

    if (txtFile) {
      const isTxtFile = txtFile.contentType?.startsWith('text/');

      if (!isTxtFile && interaction.eventType === 'interaction') {
        await interaction.reply('Interaction not allowed');
        return;
      }
    }

    const eventType = interaction.eventType === 'message' ? PIPELINE_EVENTS.DECISION_INPUT_PROCESSED : DiscordCommands.getDiscordEventType(command, { isOwner, isAdmin });

    if (!eventType) {
      await interaction.reply('Interaction not allowed');
      return;
    }

    interaction.content = content;
    interaction.img = isValidImage ? image?.url : undefined;
    interaction.txt = txtFile?.url;

    Emitter.emit(EVENTS.DISCORD_INTERACTION_VALIDATED, { eventType, interaction, content, image, user, userId, guildId, isDM });
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
  isDM,
}: {
  eventType: string;
  interaction: DiscordInteraction | DiscordMessage;
  user: string;
  userId: string;
  guildId: string;
  isDM: boolean;
}) => {
  let loadingInterval: NodeJS.Timeout | undefined;

  try {
    if (interaction.eventType === 'interaction') {
      loadingInterval = await handleResponseLoading(interaction, user, interaction.content, {
        image: interaction.img,
        txt: interaction.txt,
      });
    }

    Emitter.emit(eventType, {
      data: {
        id: guildId,
        userId: userId,
        name: user,
        input: buildUserPrompt(interaction.user, user, interaction.content, interaction.channelId, isDM),
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
