import type { GuildMember } from 'discord.js';
import type { Discord } from '../services';
import type { DiscordInteraction } from '../../@types';

import { Emitter, logger } from '../services';
import { EVENTS } from '../config/constants';
import { DiscordCommands } from './helpers/commands';
import { getUserTypes } from './helpers/discord';

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

    Emitter.emit(eventType, { interaction, content, image, user, guildId });
  });
};

export default handler;
