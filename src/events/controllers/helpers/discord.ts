import type { User, GuildMember, APIInteractionGuildMember, InteractionResponse, Message } from 'discord.js';
import type { DiscordInteraction } from '../../../../@types';

import { hideLinkEmbed, PermissionsBitField, PermissionFlagsBits, EmbedType } from 'discord.js';

import { DISCORD_ADMIN_ID, THEME } from '../../../config/env';
import { LOADING_PHRASES } from '../../../config/phrases';
import { sleep } from '../../../utils';
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

const formatResponse = (response: string, maxLength: number = DISCORD_MAX_LENGTH): string[] => {
  let responseMessages = [];
  if (response.length > maxLength) {
    responseMessages = splitText(response, maxLength);
  } else {
    responseMessages.push(response);
  }

  return responseMessages;
};

const setupLoadingMessage = () => {
  const loadingPhrases = LOADING_PHRASES[THEME ?? ''];
  if (!loadingPhrases) {
    let dots = 0;
    return () => {
      if (dots > 3) {
        dots = 0;
      }
      dots++;
      return '。'.repeat(dots);
    };
  }

  const lastValue = Math.floor(Math.random() * loadingPhrases.length);
  return () => {
    let randomIndex = lastValue;
    while (lastValue === randomIndex) {
      randomIndex = Math.floor(Math.random() * loadingPhrases.length);
    }

    return loadingPhrases[randomIndex];
  };
};

const handleResponseLoading = async (
  interaction: DiscordInteraction,
  user: string,
  query: string,
  { image, txt }: { image?: string; txt?: string } = {},
) => {
  const WAIT_TIME = 2500;
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

  const generateLoadingMessage = setupLoadingMessage();

  await interaction.reply({
    content: `${resultMessage}\n_${generateLoadingMessage()}_`,
    files,
  });

  const interval = setInterval(async () => {
    await interaction.editReply({
      content: `${resultMessage}\n_${generateLoadingMessage()}_`,
    });
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

const handleSendMessage = async (sendFn: (msg: string) => Promise<unknown>, message: string) => {
  const maxResponseLength = 1500;
  const formattedResponse = formatResponse(message, maxResponseLength);

  await sendFn(formattedResponse[0]);

  if (formattedResponse.length > 1) {
    for (let i = 1; i < formattedResponse.length; i++) {
      await sleep(500);
      await sendFn(formattedResponse[i]);
    }
  }
};

const buildUserPrompt = (user: User, userName: string, prompt: string, channelId: string): string => {
  return `
[USER]
Id: ${user.id}
Name: ${userName}
ChannelId: ${channelId}

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
  handleSendMessage,
  buildUserPrompt,
};
