import type { User, GuildMember, APIInteractionGuildMember, InteractionResponse, Message } from 'discord.js';
import type { DiscordInteraction } from '../../../@types';

import { hideLinkEmbed, PermissionsBitField, PermissionFlagsBits, EmbedType } from 'discord.js';

import { DISCORD_ADMIN_ID } from '../../config/env';
import { sleep } from '../../utils';
import { splitText } from './split-text';

const DISCORD_MAX_LENGTH = 4000;

const getFormattedMessage = (message: DiscordInteraction) => {
  const [command, ...rest] = message.content.split(' ');

  return {
    command: command.replace('/', ''),
    content: rest.join(' '),
  };
};

const hideLinkEmbeds = (message: string) => {
  const result = message.replaceAll(/(http.*)/gi, (substring) => {
    const embedSafe = hideLinkEmbed(substring.replaceAll(')', '').replaceAll(' ', ''));
    const parenthesisCount = substring.match(/\)/gi)?.length || 0;

    return `${embedSafe}${')'.repeat(parenthesisCount)}`;
  });

  return result;
};

const getUserTypes = (user: User, member: GuildMember | APIInteractionGuildMember | null) => {
  const permissions = new PermissionsBitField(BigInt(PermissionFlagsBits.Administrator));
  const isAdmin = member ? (member as GuildMember).permissions.has(permissions) : false;
  const isOwner = DISCORD_ADMIN_ID === user.id;
  const isBot = user.bot;

  return {
    isOwner,
    isAdmin,
    isBot,
  };
};

const formatResponse = (response: string): string[] => {
  let responseMessages = [];
  if (response.length > DISCORD_MAX_LENGTH) {
    responseMessages = splitText(response, DISCORD_MAX_LENGTH);
  } else {
    responseMessages.push(response);
  }

  return responseMessages;
};

const handleResponseLoading = async (
  interaction: DiscordInteraction,
  user: string,
  query: string,
  { image, txt }: { image?: string; txt?: string } = {},
) => {
  const WAIT_TIME = 850;
  const resultMessage = `**${user}**: ${query}`;
  const files: { attachment: string; name: string }[] | undefined = image || txt ? [] : undefined;

  if (files) {
    if (image) {
      files.push({
        attachment: image,
        name: 'user-image.png',
      });
    }

    if (txt) {
      files.push({
        attachment: txt,
        name: 'user-text.txt',
      });
    }
  }

  await interaction.reply({
    content: resultMessage + '\n。',
    files,
  });

  let dots = 2;
  const interval = setInterval(async () => {
    if (dots > 3) dots = 1;
    await interaction.editReply({
      content: `${resultMessage}\n` + '。'.repeat(dots),
    });
    dots++;
  }, WAIT_TIME);

  return interval;
};

const handleInteractionReply = async (
  interaction: DiscordInteraction,
  user: string,
  query: string,
  response: string,
  isInitialReply = false,
) => {
  const formattedResponse = formatResponse(response);

  const replyContent = {
    content: `**${user}**: ${query}`,
    embeds: [
      {
        type: EmbedType.Rich,
        title: formattedResponse.length > 1 ? `:thread: 1 / ${formattedResponse.length}` : undefined,
        description: formattedResponse[0],
      },
    ],
  };

  let interactionReply: InteractionResponse | Message | DiscordInteraction = interaction;

  if (isInitialReply) {
    interactionReply = await interaction.reply(replyContent);
  } else {
    interactionReply = await interaction.editReply(replyContent);
  }

  if (formattedResponse.length > 1) {
    for (let i = 1; i < formattedResponse.length; i++) {
      await sleep(400);
      interactionReply = await (interactionReply as Message).reply({
        embeds: [
          {
            type: EmbedType.Rich,
            title: `:thread: ${i + 1} / ${formattedResponse.length}`,
            description: formattedResponse[i],
          },
        ],
      });
    }
  }
};

const buildUserPrompt = (user: User, userName: string, prompt: string): string => {
  return `
[USER]
ID: ${user.id}
Name: ${userName}

[MESSAGE]
${prompt}
`;
};

export {
  DISCORD_MAX_LENGTH,
  getUserTypes,
  getFormattedMessage,
  hideLinkEmbeds,
  handleResponseLoading,
  handleInteractionReply,
  buildUserPrompt,
};
