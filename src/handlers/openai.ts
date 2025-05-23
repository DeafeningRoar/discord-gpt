import type { DiscordInteraction } from '../../@types';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';
import type { ResponseInputContent } from 'openai/resources/responses/responses';

import axios from 'axios';

import { Emitter, logger } from '../services';
import { OPENAI_EVENTS } from '../config/constants';
import { OpenAICommands } from './helpers/commands';
import {
  handleResponseLoading,
  handleInteractionReply,
  getHistoryCache,
  setHistoryCache,
  formatPerplexityHistory,
} from './helpers/openai-interaction';
import { embedCitations } from './helpers/response-formatters';

interface TextQueryParams {
  interaction: DiscordInteraction;
  content: string;
  user: string;
  guildId: string;
  image?: string;
}

type WebQueryParams = Omit<TextQueryParams, 'image'>;

const cacheKey = 'openai-chat-history';
const getGuildKey = (guildId: string): string => `${guildId}-${cacheKey}`;

const getTextFileContent = async (txtFile: string): Promise<string> => {
  const fileContent = await axios.get(txtFile, { responseType: 'arraybuffer' });

  return fileContent.data.toString('utf-8');
};

const handleFileContent = async (interaction: DiscordInteraction): Promise<void> => {
  let fileContent: string | undefined = undefined;

  if (interaction.txt) {
    fileContent = await getTextFileContent(interaction.txt);
    interaction.content = `${interaction.content}\nFile content: ${fileContent}`;
  }
};

const handler = () => {
  Emitter.on(OPENAI_EVENTS.OPENAI_TEXT_QUERY, async ({ interaction, user, guildId }: TextQueryParams) => {
    let interval;
    const originalContent = interaction.content;
    interaction.content = `Sent by ${user}: ${interaction.content}`;

    try {
      await handleFileContent(interaction);

      interval = await handleResponseLoading(interaction, user, originalContent, {
        image: interaction.img,
        txt: interaction.txt,
      });

      const guildCacheKey = guildId ? getGuildKey(guildId) : undefined;
      const history = getHistoryCache({ guildCacheKey });

      const { response } = await OpenAICommands.askGPTText(interaction, {
        user,
        chatHistory: history as ChatCompletionMessageParam[],
      });

      clearInterval(interval);

      setHistoryCache({
        guildCacheKey,
        content: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: interaction.content },
              ...((interaction.img
                ? [{ type: 'input_image', image_url: interaction.img }]
                : []) as ResponseInputContent[]),
            ],
          },
          { role: 'assistant', content: response },
        ],
      });

      logger.log('OpenAI Text Interaction Response:', {
        user,
        responseLength: response.length,
      });

      await handleInteractionReply(interaction, user, originalContent, response);
    } catch (err) {
      clearInterval(interval);

      throw err;
    }
  });

  Emitter.on(OPENAI_EVENTS.OPENAI_WEB_QUERY, async ({ interaction, user, guildId }: WebQueryParams) => {
    let interval;
    const originalContent = interaction.content;
    interaction.content = `Sent by ${user}: ${interaction.content}`;

    try {
      await handleFileContent(interaction);

      interval = await handleResponseLoading(interaction, user, originalContent, { txt: interaction.txt });

      const guildCacheKey = guildId ? getGuildKey(guildId) : undefined;
      const history = getHistoryCache({ guildCacheKey, formatter: formatPerplexityHistory });

      const { response, citations } = await OpenAICommands.askGPTWeb(interaction, {
        user,
        chatHistory: history,
      });

      clearInterval(interval);

      setHistoryCache({
        guildCacheKey,
        content: [
          { role: 'user', content: interaction.content },
          { role: 'assistant', content: response },
        ],
      });

      logger.log('OpenAI Web Interaction Response:', {
        user,
        responseLength: response.length,
      });

      const formattedResponse = embedCitations(response, citations);

      await handleInteractionReply(interaction, user, originalContent, formattedResponse);
    } catch (err) {
      clearInterval(interval);

      throw err;
    }
  });
};

export default handler;
