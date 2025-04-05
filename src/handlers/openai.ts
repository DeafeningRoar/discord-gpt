import type { DiscordInteraction } from '../types';

import { Emitter, Cache, logger } from '../services';
import { OPENAI_EVENTS } from '../config/constants';
import { OpenAI } from './helpers/discord-commands';
import { handleResponseLoading, handleInteractionReply } from './helpers/openai-interaction';

type TextQueryParams = {
  interaction: DiscordInteraction;
  content: string;
  user: string;
  guildId: string;
  image?: string;
};

type WebQueryParams = Omit<TextQueryParams, 'image' | 'guildId'>;

const handler = () => {
  Emitter.on(
    OPENAI_EVENTS.OPENAI_TEXT_QUERY,
    async ({ interaction, content, user, guildId, image }: TextQueryParams) => {
      console.log(interaction);
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
          responseLength: response.length
        });

        await handleInteractionReply(interaction, user, content, response);
      } catch (err) {
        clearInterval(interval);

        throw err;
      }
    }
  );

  Emitter.on(OPENAI_EVENTS.OPENAI_WEB_QUERY, async ({ interaction, user, content }: WebQueryParams) => {
    let interval;

    try {
      interval = await handleResponseLoading(interaction, user, content);

      const { response } = await OpenAI.askGPTWeb(interaction, { user });

      clearInterval(interval);

      logger.log('OpenAI Web Interaction Response:', {
        user,
        responseLength: response.length
      });

      await handleInteractionReply(interaction, user, content, response);
    } catch (err) {
      clearInterval(interval);

      throw err;
    }
  });
};

export default handler;
