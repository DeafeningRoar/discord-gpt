import type { GuildMember } from 'discord.js';
import type { Discord } from '../services';
import type { DiscordInteraction, DiscordResponseEvent } from '../../@types';

import { Emitter, logger } from '../services';
import { EVENTS } from '../config/constants';
import { DiscordCommands } from './helpers/commands';
import { getUserTypes, handleInteractionReply, handleResponseLoading } from './helpers/discord';

const handler = ({ discord }: { discord: Discord }) => {
  Emitter.on(EVENTS.DISCORD_READY, async () => {
    if (!discord.client?.isReady()) {
      throw new Error(`${EVENTS.DISCORD_READY} - Discord client not ready`);
    }
  });

  Emitter.on(EVENTS.DISCORD_INTERACTION_PROCESSED, async ({ response, responseMetadata }: DiscordResponseEvent) => {
    const { interaction, user, query, isEdit } = responseMetadata;

    await handleInteractionReply(interaction, user, query, response, !isEdit);
  });

  Emitter.on(EVENTS.DISCORD_INTERACTION_CREATED, async ({ interaction }: { interaction: DiscordInteraction }) => {
    const { isOwner, isAdmin, isBot } = getUserTypes(interaction.user, interaction.member);

    if (isBot) return;
    const command = interaction.commandName;
    const content = interaction.options.get('input')?.value as string;
    const image = interaction.options.get('image')?.attachment;
    const txtFile = interaction.options.get('txt')?.attachment;
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
      hasTxtFile: !!txtFile,
      content,
    });

    if (image && image?.url) {
      const isImage = image.contentType?.startsWith('image/');

      if (!isImage) {
        await interaction.reply('Interaction not allowed');
        return;
      }
    }

    if (txtFile && txtFile?.url) {
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

    Emitter.emit(EVENTS.DISCORD_INTERACTION_VALIDATED, { eventType, interaction, content, image, user, guildId });
  });

  Emitter.on(
    EVENTS.DISCORD_INTERACTION_VALIDATED,
    async ({
      eventType,
      interaction,
      user,
      guildId,
    }: {
      eventType: string;
      interaction: DiscordInteraction;
      user: string;
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
            name: user,
            input: interaction.content,
            files: {
              image: interaction.img,
              txt: interaction.txt,
            },
          },
          responseEvent: EVENTS.DISCORD_INTERACTION_PROCESSED,
          responseMetadata: {
            query: interaction.content,
            isEdit: true,
            interaction,
            user,
          },
          loadingInterval,
        });
      } catch (error: unknown) {
        logger.error('Error processing interaction:', error);

        if (loadingInterval) {
          clearInterval(loadingInterval);
        }
      }
    },
  );
};

export default handler;
