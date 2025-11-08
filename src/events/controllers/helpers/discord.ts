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

const dottedSequence = () => {
  let position = 0;
  const fn = () => {
    const sequence = ['●', '○', '○'];
    if (position > sequence.length - 1) {
      position = 0;
    }

    const message = sequence
      .reduce((acc, next, index) => {
        let auxPosition = index + position;
        if (auxPosition > sequence.length - 1) {
          auxPosition = Math.abs(sequence.length - auxPosition);
        }
        acc[auxPosition] = next;
        return acc;
      }, [] as string[])
      .join(' ');

    position++;
    return message;
  };

  return { waitTime: 1000, next: fn };
};

const snakeSequence = () => {
  let position = 0;
  const fn = () => {
    const sequence = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    if (position > sequence.length - 1) {
      position = 0;
    }

    const message = sequence[position];

    position++;
    return message;
  };

  return { waitTime: 500, next: fn };
};

const setupLoadingMessage = () => {
  const loadingPhrases = LOADING_PHRASES[THEME ?? ''];
  if (!loadingPhrases) {
    const sequenceSelector = Math.floor(Math.random() * 2) + 1;
    const generator = sequenceSelector === 1 ? dottedSequence() : snakeSequence();
    return { waitTime: generator.waitTime, generateMessage: generator.next };
  }

  const lastValue = Math.floor(Math.random() * loadingPhrases.length);
  const generateMessage = () => {
    let randomIndex = lastValue;
    while (lastValue === randomIndex) {
      randomIndex = Math.floor(Math.random() * loadingPhrases.length);
    }

    return loadingPhrases[randomIndex];
  };

  return { waitTime: 2500, generateMessage };
};

const handleResponseLoading = async (
  interaction: DiscordInteraction,
  user: string,
  query: string,
  { image, txt }: { image?: string; txt?: string } = {},
) => {
  const { waitTime, generateMessage } = setupLoadingMessage();
  let resultMessage = `**${user}**: ${query}`;
  const files: { attachment: string; name: string }[] | undefined = image || txt ? [] : undefined;

  if (resultMessage.length > 1950) {
    resultMessage = resultMessage.slice(0, 1950) + '...';
  }

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
    content: `${resultMessage}\n_${generateMessage()}_`,
    files,
  });

  const interval = setInterval(async () => {
    await interaction.editReply({
      content: `${resultMessage}\n_${generateMessage()}_`,
    });
  }, waitTime);

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
  let userContent = `**${user}**: ${query}`;

  if (userContent.length > 1950) {
    userContent = userContent.slice(0, 1950) + '...';
  }

  const replyContent = {
    content: userContent,
    embeds: [
      {
        type: EmbedType.Rich,
        title: formattedResponse.length > 1 ? `:thread: 1 / ${formattedResponse.length}` : undefined,
        description: formattedResponse[0],
      },
    ],
  };

  // Force save channel to cache to prevent Discord error where DMs immediately delete the channel from cache.
  if (interaction.guildId) {
    await interaction.guild?.channels.fetch(interaction.channelId);
  } else {
    await interaction.client.channels.fetch(interaction.channelId);
  }

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

const buildUserPrompt = (user: User, userName: string, prompt: string, channelId: string, isDM: boolean): string => {
  return `
[USER]
Id: ${user.id}
Name: ${userName}
ChannelId: ${isDM ? user.id : channelId}

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
