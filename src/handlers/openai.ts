import type { BusinessLogicEvent, AIProcessInputEvent } from '../../@types';

import { Emitter, logger } from '../services';
import { OPENAI_EVENTS } from '../config/constants';

import { AIStrategyFactory } from '../strategies/ai-strategy-factory';
import { AIStrategyName } from '../strategies/ai-strategy';

const handler = () => {
  Emitter.on(OPENAI_EVENTS.OPENAI_TEXT_QUERY, async (event: BusinessLogicEvent) => {
    const aiProcessInputEvent: AIProcessInputEvent = {
      ...event,
      processMetadata: {
        strategyName: AIStrategyName.OPENAI,
      },
    };

    Emitter.emit(OPENAI_EVENTS.OPENAI_PROCESS_INPUT, aiProcessInputEvent);
  });

  Emitter.on(OPENAI_EVENTS.OPENAI_WEB_QUERY, async (event: BusinessLogicEvent) => {
    const aiProcessInputEvent: AIProcessInputEvent = {
      ...event,
      processMetadata: {
        strategyName: AIStrategyName.PERPLEXITY,
      },
    };

    Emitter.emit(OPENAI_EVENTS.OPENAI_PROCESS_INPUT, aiProcessInputEvent);
  });

  Emitter.on(
    OPENAI_EVENTS.OPENAI_PROCESS_INPUT,
    async ({
      data,
      responseEvent,
      responseMetadata,
      loadingInterval,
      processMetadata,
      cacheStrategy,
    }: AIProcessInputEvent) => {
      const { id, name, input, files } = data;

      const strategy = AIStrategyFactory.getStrategy(processMetadata.strategyName);
      if (cacheStrategy) {
        strategy.setCacheStrategy(cacheStrategy);
      }

      try {
        const response = await strategy.process({
          id,
          name,
          input,
          image: files?.image,
          txt: files?.txt,
        });

        logger.log('OpenAI Response:', {
          id,
          name,
          strategy: strategy.name,
          responseLength: response.length,
        });

        if (loadingInterval) {
          clearInterval(loadingInterval);
        }

        Emitter.emit(responseEvent, {
          response,
          responseMetadata,
        });
      } catch (err) {
        if (loadingInterval) {
          clearInterval(loadingInterval);
        }

        Emitter.emit(responseEvent, {
          response: 'Error 💀',
          responseMetadata,
        });

        throw err;
      }
    },
  );
};

export default handler;
