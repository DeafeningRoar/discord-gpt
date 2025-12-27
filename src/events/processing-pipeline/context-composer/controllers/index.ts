import type { AIDecisionPipelineEvent, AIDecisionPipelineResponseEvent } from '../../../../../@types';
import type { Conversation } from '../../../../database/schemas/conversation';

import { Emitter, logger } from '../../../../services';
import { PIPELINE_EVENTS } from '../../../../config/constants';
import { conversation } from '../../../../database';
import { OPENAI_DISCORD_SYSTEM_PROMPT } from '../../../../config/env';

const handleProcessInputEvent = async (event: AIDecisionPipelineEvent) => {
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
      throw new Error(`Could not find document with id ${id}`);
    }

    const input = [
      { role: 'system', content: OPENAI_DISCORD_SYSTEM_PROMPT as string },
      ...(document.summary?.factual
        ? [
            {
              role: 'system',
              content: `
[SUMMARY]
The following is a summary of the conversation so far
---
${document.summary.factual}
`,
            },
          ]
        : []),
      ...document.liveBuffer
        .toSorted((a, b) => a.ts.getTime() - b.ts.getTime())
        .map(({ role, content }) => ({ role, content })),
    ];

    Emitter.emit(PIPELINE_EVENTS.PROCESS_AGENT_RESPONSE, {
      ...event,
      processedInput: { input },
      responseMetadata: { ...event.responseMetadata, responseEvent: event.responseEvent },
      responseEvent: PIPELINE_EVENTS.CONTEXT_COMPOSER_AGENT_RESPONSE_PROCESSED,
    } as AIDecisionPipelineEvent);
  } catch (error: unknown) {
    const err = error as Error;

    logger.error('Error composing context', {
      message: err.message,
      cause: err.cause,
      stack: err.stack,
    });

    throw error;
  }
};

const handleAgentResponseProcessed = async (event: AIDecisionPipelineResponseEvent) => {
  try {
    const {
      data: { id },
      response,
      context,
      responseMetadata,
    } = event;
    const model = conversation.getModel();

    await model.updateOne(
      {
        channelId: id,
        'state.active': true,
        source: context?.source,
      },
      {
        $push: {
          liveBuffer: { role: 'assistant', content: response },
        },
        $set: {
          'state.lastBotMessageAt': Date.now(),
          updatedAt: Date.now(),
        },
        $inc: { version: 1 },
      },
    );

    const responseEvent = responseMetadata.responseEvent as string;

    Emitter.emit(responseEvent, event);
  } catch (error: unknown) {
    const err = error as Error;

    logger.error('Error composing context', {
      message: err.message,
      cause: err.cause,
      stack: err.stack,
    });

    throw error;
  }
};

export { handleProcessInputEvent, handleAgentResponseProcessed };
