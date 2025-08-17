import type { BusinessLogicEvent, AIProcessInputEvent } from '../../../@types';

import { Emitter, logger } from '../../services';
import { OPENAI_EVENTS } from '../../config/constants';

import { AIStrategyFactory } from '../../strategies/ai-strategy-factory';
import { AIStrategyName } from '../../strategies/ai-strategy';

const handleOpenAITextQuery = async (event: BusinessLogicEvent) => {
  const aiProcessInputEvent: AIProcessInputEvent = {
    ...event,
    aiProcessMetadata: {
      strategyName: AIStrategyName.OPENAI,
    },
  };

  Emitter.emit(OPENAI_EVENTS.OPENAI_PROCESS_INPUT, aiProcessInputEvent);
};

const handleOpenAIWebQuery = async (event: BusinessLogicEvent) => {
  const aiProcessInputEvent: AIProcessInputEvent = {
    ...event,
    aiProcessMetadata: {
      strategyName: AIStrategyName.PERPLEXITY,
    },
  };

  Emitter.emit(OPENAI_EVENTS.OPENAI_PROCESS_INPUT, aiProcessInputEvent);
};

const handleOpenAIInput = async ({
  data,
  responseEvent,
  errorEvent,
  responseMetadata,
  processMetadata,
  aiProcessMetadata,
  cacheStrategy,
  context,
}: AIProcessInputEvent) => {
  const { id, userId, name, input, files } = data;

  const strategy = AIStrategyFactory.getStrategy(aiProcessMetadata.strategyName);

  try {
    await strategy.initialize({ id, userId, context, cacheConfig: cacheStrategy });

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

    Emitter.emit(responseEvent, {
      response,
      responseMetadata,
      processMetadata,
    });
  } catch (err) {
    logger.error('Error processing Agent request', {
      id,
      name,
      input,
      files,
    });

    if (errorEvent) {
      Emitter.emit(errorEvent, { processMetadata });
    }

    Emitter.emit(responseEvent, {
      response: 'Error 💀',
      responseMetadata,
      processMetadata,
    });

    throw err;
  }
};

export default {
  handleOpenAIInput,
  handleOpenAITextQuery,
  handleOpenAIWebQuery,
};
