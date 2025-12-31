import type { AIPipelineEvent } from '../../../../../@types';
import type { Conversation } from '../../../../database/schemas';
import type { Response } from 'openai/resources/responses/responses';

import { zodTextFormat } from 'openai/helpers/zod';

import { Emitter, eventLogger } from '../../../../services';
import OpenAI from '../../../../services/ai-services/openai-generic';
import { conversation } from '../../../../database';
import { DECISION_ACTIONS } from '../../../../config/constants';
import { AGENT_TYPES, getAgentConfig } from '../../helpers';

import { decisionMakingSchema, getProcessedDecision } from './helpers';

const buildDecisionInput = (document: Conversation) => ({
  event: {
    type: 'PENDING_BATCH',
    messages: document.pending.toSorted((a, b) => a.ts.getTime() - b.ts.getTime()),
  },
  conversationState: {
    secondsSinceLastSpeak: document.state.lastBotMessageAt
      ? Math.floor((Date.now() - document.state.lastBotMessageAt.getTime()) / 1000)
      : null,
    thinkCount: document.metadata.thinkCount || 0,
    ignoreCount: document.metadata.ignoreCount || 0,
    pendingSpeak: document.metadata.pendingSpeak === true,
  },
  batchStats: {
    messageCount: document.pending.length,
  },
});

const buildPreviousInputsSnippet = (document: Conversation) => ({
  event: {
    type: 'RECENT_CONTEXT',
    messages: document.liveBuffer.toSorted((a, b) => a.ts.getTime() - b.ts.getTime()).slice(-20),
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

    const agentConfig = await getAgentConfig(AGENT_TYPES.DECISION);
    const decisionAgent = new OpenAI({ model: agentConfig.model });

    const input = [
      { role: 'system', content: agentConfig.prompt },
      { role: 'user', content: JSON.stringify(buildPreviousInputsSnippet(document)) },
      { role: 'user', content: JSON.stringify(buildDecisionInput(document)) },
    ];

    const { output_text: output } = (await decisionAgent.query(input, {
      format: zodTextFormat(decisionMakingSchema, 'decision'),
    })) as Response;

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
