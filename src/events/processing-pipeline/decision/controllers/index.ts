import type { AIPipelineEvent } from '../../../../../@types';
import type { Conversation } from '../../../../database/schemas/conversation';

import { zodTextFormat } from 'openai/helpers/zod';

import { Emitter, logger } from '../../../../services';
import { DECISION_AI_AGENT, DECISION_AI_AGENT_SYSTEM_PROMPT } from '../../../../config/env';
import OpenAI from '../../../../services/ai-services/openai-generic';
import { conversation } from '../../../../database';

import { decisionMakingSchema, getProcessedDecision } from './helpers';

const decisionAgent = new OpenAI({ model: DECISION_AI_AGENT as string });

const handleProcessInputEvent = async (event: AIPipelineEvent) => {
  try {
    const {
      data: { id },
      context,
    } = event;
    const model = conversation.getModel();
    const findCondition = { channelId: id, 'state.active': true, source: context?.source };

    const document = await model.findOne<Conversation>(findCondition);

    if (!document) {
      throw new Error(`Could not find active conversation with id ${id}`);
    }

    const input = [
      { role: 'system', content: DECISION_AI_AGENT_SYSTEM_PROMPT as string },
      ...document.pending.map(({ role, content }) => ({ role, content })),
    ];

    const { output_text: output } = await decisionAgent.query(input, {
      format: zodTextFormat(decisionMakingSchema, 'decision'),
    });

    const parsedOutput = JSON.parse(output);

    const nextStep = getProcessedDecision(parsedOutput);

    logger.info('Decision taken with current input', { ...parsedOutput, nextStep });

    await model.updateOne(findCondition, { $set: { lastDecision: { ...parsedOutput, ts: Date.now() } } });

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
