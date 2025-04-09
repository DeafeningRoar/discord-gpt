import type { DiscordInteraction } from '../types';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';
import type { ResponseInputContent } from 'openai/resources/responses/responses';

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

const handler = () => {
  Emitter.on(
    OPENAI_EVENTS.OPENAI_TEXT_QUERY,
    async ({ interaction, content, user, guildId, image }: TextQueryParams) => {
      let interval;

      try {
        interval = await handleResponseLoading(interaction, user, content, image);

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
                { type: 'input_text', text: content },
                ...((image ? [{ type: 'input_image', image_url: image }] : []) as ResponseInputContent[]),
              ],
            },
            { role: 'assistant', content: response },
          ],
        });

        logger.log('OpenAI Text Interaction Response:', {
          user,
          responseLength: response.length,
        });

        await handleInteractionReply(interaction, user, content, response);
      } catch (err) {
        clearInterval(interval);

        throw err;
      }
    },
  );

  Emitter.on(OPENAI_EVENTS.OPENAI_WEB_QUERY, async ({ interaction, content, user, guildId }: WebQueryParams) => {
    let interval;

    try {
      interval = await handleResponseLoading(interaction, user, content);

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
          { role: 'user', content },
          { role: 'assistant', content: response },
        ],
      });

      logger.log('OpenAI Web Interaction Response:', {
        user,
        responseLength: response.length,
      });

      const formattedResponse = embedCitations(response, citations);

      await handleInteractionReply(interaction, user, content, formattedResponse);
    } catch (err) {
      clearInterval(interval);

      throw err;
    }
  });
};

export default handler;
