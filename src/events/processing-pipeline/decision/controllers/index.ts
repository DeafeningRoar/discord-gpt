import type { AIPipelineEvent } from '../../../../../@types';
import type { Conversation } from '../../../../database/schemas/conversation';

import { zodTextFormat } from 'openai/helpers/zod';

import { Emitter, eventLogger } from '../../../../services';
import { DECISION_AI_AGENT, DECISION_AI_AGENT_SYSTEM_PROMPT } from '../../../../config/env';
import OpenAI from '../../../../services/ai-services/openai-generic';
import { conversation } from '../../../../database';
import { DECISION_ACTIONS } from '../../../../config/constants';

import { decisionMakingSchema, getProcessedDecision } from './helpers';

const decisionAgent = new OpenAI({ model: DECISION_AI_AGENT as string });

const buildDecisionInput = (document: Conversation) => ({
  event: {
    type: 'NEW_MESSAGES',
    messages: document.pending,
  },
  conversationState: {
    secondsSinceLastSpeak: (Date.now() - document.state.lastBotMessageAt.getTime()) * 60,
    thinkCount: document.metadata.thinkCount,
    ignoreCount: document.metadata.ignoreCount,
    pendingSpeak: document.metadata.pendingSpeak,
  },
  batchStats: {
    messageCount: document.pending.length,
  },
});

const handleProcessInputEvent = async (event: AIPipelineEvent) => {
  const logger = eventLogger(event);
  try {
    const {
      data: { id },
      context,
    } = event;
    const model = conversation.getModel();
    const document = await model.findOne<Conversation>({
      channelId: id,
      'state.active': true,
      source: context?.source,
    });

    if (!document) {
      logger.info('Could not find document to decide with', {
        channelId: id,
        'state.active': true,
        source: context?.source,
      });
      return;
    }

    const input = [
      { role: 'system', content: DECISION_AI_AGENT_SYSTEM_PROMPT as string },
      { role: 'user', content: JSON.stringify(buildDecisionInput(document)) },
    ];

    const { output_text: output } = await decisionAgent.query(input, {
      format: zodTextFormat(decisionMakingSchema, 'decision'),
    });

    const parsedOutput = JSON.parse(output);

    const { action, event: nextEvent } = getProcessedDecision(parsedOutput);

    logger.info('Decision taken with current input', {
      agentDecision: parsedOutput,
      nextStep: { action, event: nextEvent },
    });

    const { matchedCount } = await model.updateOne(
      { _id: document._id, version: document.version },
      {
        $set: {
          lastDecision: { ...parsedOutput, ts: Date.now() },
        },
      },
    );

    if (matchedCount === 0 && action !== DECISION_ACTIONS.SPEAK) {
      logger.info('Document has been previously updated, discarding changes in DECISION');
      return;
    }

    Emitter.emit(nextEvent, event);
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
