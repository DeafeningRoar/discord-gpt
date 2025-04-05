import type { DiscordInteraction } from '../../types';

import { EmbedType } from 'discord.js';

import { sleep } from '../../utils';
import { splitText } from './split-text';
import { DISCORD_MAX_LENGTH } from './discord';

const handleResponseLoading = async (interaction: DiscordInteraction, user: string, query: string, img?: string) => {
  const WAIT_TIME = 850;
  const resultMessage = `**${user}**: ${query}`;
  const files = img
    ? [
        {
          attachment: img,
          name: 'user-image.png'
        }
      ]
    : undefined;

  await interaction.reply({
    content: resultMessage + '\n。',
    files
  });

  let dots = 2;
  const interval = setInterval(async () => {
    if (dots > 3) dots = 1;
    await interaction.editReply({
      content: `${resultMessage}\n` + '。'.repeat(dots)
    });
    dots++;
  }, WAIT_TIME);

  return interval;
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

const handleInteractionReply = async (
  interaction: DiscordInteraction,
  user: string,
  query: string,
  response: string
) => {
  const formattedResponse = formatResponse(response);

  let interactionReply = await interaction.editReply({
    content: `**${user}**: ${query}`,
    embeds: [
      {
        type: EmbedType.Rich,
        title: formattedResponse.length > 1 ? `:thread: 1 / ${formattedResponse.length}` : undefined,
        description: formattedResponse[0]
      }
    ]
  });

  if (formattedResponse.length > 1) {
    for (let i = 1; i < formattedResponse.length; i++) {
      await sleep(400);
      interactionReply = await interactionReply.reply({
        embeds: [
          {
            type: EmbedType.Rich,
            title: `:thread: ${i + 1} / ${formattedResponse.length}`,
            description: formattedResponse[i]
          }
        ]
      });
    }
  }
};

export { handleResponseLoading, formatResponse, handleInteractionReply };
