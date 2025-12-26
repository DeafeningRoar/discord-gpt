import type { AIPipelineEvent } from '../../../../../@types';

import { zodTextFormat } from 'openai/helpers/zod';

import { Emitter, logger } from '../../../../services';
import { DECISION_AI_AGENT, DECISION_AI_AGENT_SYSTEM_PROMPT } from '../../../../config/env';

import OpenAI from '../../../../services/ai-services/openai-generic';
import { AICacheStrategy } from '../../../../strategies/ai-cache-strategy';

import { decisionMakingSchema, getProcessedDecision } from './helpers';

const decisionAgent = new OpenAI({ model: DECISION_AI_AGENT as string });

const handleProcessInputEvent = async (event: AIPipelineEvent) => {
  try {
    const cacheService = new AICacheStrategy(event.cacheStrategy);
    const cacheKey = cacheService.getCacheKey(event.data.id);
    const history = cacheService.getHistoryCache({ cacheKey });

    const { output_text: output } = await decisionAgent.query(event.data.input, {
      systemPrompt: DECISION_AI_AGENT_SYSTEM_PROMPT as string,
      format: zodTextFormat(decisionMakingSchema, 'decision'),
      chatHistory: history,
    });

    if (!output) {
      throw new Error('No decision output received');
    }

    const parsedOutput = JSON.parse(output) as typeof decisionMakingSchema._type;

    const nextStep = getProcessedDecision(parsedOutput);

    if (!nextStep) {
      logger.log('No next step provided, skipping');
      return;
    }

    logger.info('Decision taken with current input', { ...parsedOutput, nextStep });

    Emitter.emit(nextStep, { ...event, decisionMetadata: parsedOutput });
  } catch (error: unknown) {
    const err = error as Error;

    logger.error('Error during decision process', {
      message: err.message,
      stack: err.stack,
    });

    throw error;
  }
};

export { handleProcessInputEvent };
