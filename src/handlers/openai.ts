import type { DiscordInteraction } from '../types';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';

import { Emitter, Cache, logger } from '../services';
import { OPENAI_EVENTS } from '../config/constants';
import { OpenAI } from './helpers/discord-commands';
import { handleResponseLoading, handleInteractionReply } from './helpers/openai-interaction';
import { embedCitations } from './helpers/response-formatters';

interface TextQueryParams {
  interaction: DiscordInteraction;
  content: string;
  user: string;
  guildId: string;
  image?: string;
}

type WebQueryParams = Omit<TextQueryParams, 'image'>;

const handler = () => {
  Emitter.on(
    OPENAI_EVENTS.OPENAI_TEXT_QUERY,
    async ({ interaction, content, user, guildId, image }: TextQueryParams) => {
      let interval;

      try {
        interval = await handleResponseLoading(interaction, user, content, image);

        const previousResponseId = guildId ? Cache.getCache<string>(guildId) : undefined;

        const { id, response } = await OpenAI.askGPTText(interaction, { user, previousResponseId });

        clearInterval(interval);

        if (guildId) {
          Cache.setCache(guildId, id, 300);
        }

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

      const cached = Cache.getCache<string>(`web-${guildId}`);
      const chatHistory: ChatCompletionMessageParam[] = cached ? JSON.parse(cached) : [];

      console.log('Chat history:', chatHistory);
      const { response, citations } = await OpenAI.askGPTWeb(interaction, { user, chatHistory });

      clearInterval(interval);

      if (guildId) {
        chatHistory.push({ role: 'user', content }, { role: 'assistant', content: response });
        Cache.setCache(`web-${guildId}`, JSON.stringify(chatHistory), 300);
      }

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
