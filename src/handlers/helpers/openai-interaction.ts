import type { DiscordInteraction } from '../../../@types';
import type { ResponseInput, ResponseInputText } from 'openai/resources/responses/responses';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';

import { EmbedType } from 'discord.js';

import { sleep } from '../../utils';
import { splitText } from './split-text';
import { DISCORD_MAX_LENGTH } from './discord';
import { Cache } from '../../services';

type ChatHistoryItem = Pick<ChatCompletionMessageParam, 'role'> & {
  content: ResponseInputText[] | string;
  timestamp: number;
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
  response: string,
) => {
  const formattedResponse = formatResponse(response);

  let interactionReply = await interaction.editReply({
    content: `**${user}**: ${query}`,
    embeds: [
      {
        type: EmbedType.Rich,
        title: formattedResponse.length > 1 ? `:thread: 1 / ${formattedResponse.length}` : undefined,
        description: formattedResponse[0],
      },
    ],
  });

  if (formattedResponse.length > 1) {
    for (let i = 1; i < formattedResponse.length; i++) {
      await sleep(400);
      interactionReply = await interactionReply.reply({
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

const cacheTTL = Number(process.env.OPENAI_CACHE_TTL || 300); // 5 minutes

const setHistoryCache = ({
  guildCacheKey,
  content,
}: {
  guildCacheKey?: string;
  content?: ChatCompletionMessageParam[] | ResponseInput;
}): boolean => {
  if (!guildCacheKey) return false;
  const timestamp = new Date().getTime();
  const cached = JSON.parse(Cache.getCache<string>(guildCacheKey) || '[]') as ChatHistoryItem[];

  const history = [...(cached || []), ...((content || []) as ChatHistoryItem[])]
    .map(item => ({
      ...item,
      timestamp: item.timestamp || timestamp,
    }))
    .sort((a, b) => {
      if (a.timestamp === b.timestamp) {
        if (a.role === 'assistant' && b.role === 'user') return 1;
        if (a.role === 'user' && b.role === 'assistant') return -1;
        return 0;
      }
      return (a.timestamp || 0) - (b.timestamp || 0);
    });

  return Cache.setCache(guildCacheKey, JSON.stringify(history), cacheTTL);
};

type CacheFormatter = (history: ChatHistoryItem[]) => ChatCompletionMessageParam[];

const getHistoryCache = ({
  guildCacheKey,
  formatter = v => v as ChatCompletionMessageParam[],
}: {
  guildCacheKey?: string;
  formatter?: CacheFormatter;
}): ChatCompletionMessageParam[] => {
  const cached = guildCacheKey ? Cache.getCache<string>(guildCacheKey) : undefined;

  if (!cached) return [];

  const parsedHistory = JSON.parse(cached) as ChatHistoryItem[];
  const history = parsedHistory.map(item => ({ role: item.role, content: item.content })) as ChatHistoryItem[];

  return formatter(history);
};

const formatPerplexityHistory = (history: ChatHistoryItem[]) =>
  history.map(item => ({
    role: item.role,
    content: Array.isArray(item.content) ? item.content[0].text : item.content,
  })) as ChatCompletionMessageParam[];

export {
  handleResponseLoading,
  formatResponse,
  handleInteractionReply,
  getHistoryCache,
  setHistoryCache,
  formatPerplexityHistory,
};
