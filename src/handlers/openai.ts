import type { BusinessLogicEvent } from '../../@types';

import { Emitter, logger } from '../services';
import { OPENAI_EVENTS } from '../config/constants';

import { AIStrategyFactory } from '../strategies/ai-strategy-factory';
import { AIStrategyName } from '../strategies/ai-strategy';

interface OpenAIProcessInputEvent extends BusinessLogicEvent {
  processMetadata: {
    strategyName: string;
  };
}

const handler = () => {
  Emitter.on(OPENAI_EVENTS.OPENAI_TEXT_QUERY, async (event: BusinessLogicEvent) => {
    const aiProcessInputEvent = {
      ...event,
      processMetadata: {
        strategyName: AIStrategyName.OPENAI,
      },
    };

    Emitter.emit(OPENAI_EVENTS.OPENAI_PROCESS_INPUT, aiProcessInputEvent);
  });

  Emitter.on(OPENAI_EVENTS.OPENAI_WEB_QUERY, async (event: BusinessLogicEvent) => {
    const aiProcessInputEvent: OpenAIProcessInputEvent = {
      ...event,
      processMetadata: {
        strategyName: AIStrategyName.PERPLEXITY,
      },
    };

    Emitter.emit(OPENAI_EVENTS.OPENAI_PROCESS_INPUT, aiProcessInputEvent);
  });

  Emitter.on(
    OPENAI_EVENTS.OPENAI_PROCESS_INPUT,
    async ({ data, responseEvent, responseMetadata, loadingInterval, processMetadata }: OpenAIProcessInputEvent) => {
      const strategy = AIStrategyFactory.getStrategy(processMetadata.strategyName);
      const { id, name, input, files } = data;

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
