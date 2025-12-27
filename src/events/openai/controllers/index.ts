import type { BusinessLogicEvent, AIProcessInputEvent, AIDecisionPipelineEvent } from '../../../../@types';

import { Emitter, logger } from '../../../services';
import { OPENAI_EVENTS } from '../../../config/constants';

import { AIStrategyFactory } from '../../../strategies/ai-strategy-factory';
import { AIStrategyName } from '../../../strategies/ai-strategy';
import OpenAIService from '../../../services/ai-services/openai-generic';
import { OPENAI_TEXT_MODEL } from '../../../config/env';

const simpleAgent = new OpenAIService({
  model: OPENAI_TEXT_MODEL as string,
});

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

const handleOpenAIPipelineInput = async ({
  data,
  context,
  responseEvent,
  errorEvent,
  responseMetadata,
  processMetadata,
  processedInput,
}: AIDecisionPipelineEvent) => {
  const { id } = data;
  const { input } = processedInput || { input: [] };

  try {
    const { output_text: response } = await simpleAgent.query(input);

    logger.log('OpenAI Response:', {
      id,
      responseLength: response.length,
    });

    Emitter.emit(responseEvent, {
      data,
      context,
      response,
      responseMetadata,
      processMetadata,
    });
  } catch (err) {
    logger.error('Error processing Agent request', {
      id,
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
  handleOpenAIPipelineInput,
};
