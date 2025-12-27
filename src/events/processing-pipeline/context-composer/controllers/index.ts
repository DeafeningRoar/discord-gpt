import type { AISchedulerEvent, AISchedulerResponseEvent } from '../../../../../@types';
import type { Conversation } from '../../../../database/schemas/conversation';
import type { SpeakQueue } from '../../../../database/schemas/speak-queue';

import { Emitter, eventLogger } from '../../../../services';
import { PIPELINE_EVENTS, SOURCE_EVENTS, SPEAK_QUEUE_STATE } from '../../../../config/constants';
import { conversation, speakQueue } from '../../../../database';
import { OPENAI_DISCORD_SYSTEM_PROMPT } from '../../../../config/env';

const buildContext = (document: Conversation) => [
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
`.trim(),
        },
      ]
    : []),
  ...document.liveBuffer
    .toSorted((a, b) => a.ts.getTime() - b.ts.getTime())
    .map(({ role, content }) => ({ role, content })),
];

const handleProcessInputEvent = async (event: AISchedulerEvent) => {
  const logger = eventLogger(event);
  try {
    const {
      data: { conversationId },
      context: { source },
    } = event;
    const conversationModel = conversation.getModel();
    const speakQueueModel = speakQueue.getModel();

    const document = await conversationModel.findOneAndUpdate<Conversation>(
      {
        _id: conversationId,
        source,
        'metadata.pendingSpeak': true,
      },
      {
        $set: {
          'metadata.pendingSpeak': false,
        },
      },
    );

    if (!document) {
      throw new Error(`Could not find document with id ${conversationId}`);
    }

    const speakQueueDoc = await speakQueueModel.findOneAndUpdate<SpeakQueue>(
      {
        conversationId,
        status: SPEAK_QUEUE_STATE.CLAIMED,
      },
      {
        $set: { status: SPEAK_QUEUE_STATE.DONE },
      },
    );

    if (!speakQueueDoc) {
      logger.info('No claimed speak queue found for the current conversation, skipping', {
        conversationId: document._id,
      });
      return;
    }

    const inProgressEvent = SOURCE_EVENTS[source]?.RESPONSE_IN_PROGRESS;

    if (inProgressEvent) {
      Emitter.emit(SOURCE_EVENTS[source].RESPONSE_IN_PROGRESS, { data: { channelId: document.channelId } });
    }

    Emitter.emit(PIPELINE_EVENTS.PROCESS_AGENT_RESPONSE, {
      ...event,
      processedInput: { input: buildContext(document) },
      responseMetadata: { responseEvent: event.responseEvent },
      responseEvent: PIPELINE_EVENTS.CONTEXT_COMPOSER_AGENT_RESPONSE_PROCESSED,
    });
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

const handleAgentResponseProcessed = async (event: AISchedulerResponseEvent) => {
  const logger = eventLogger(event);
  try {
    const {
      data: { conversationId },
      response,
      context,
      responseMetadata,
    } = event;
    const conversationModel = conversation.getModel();

    const document = await conversationModel.findOneAndUpdate<Conversation>(
      {
        _id: conversationId,
        source: context?.source,
      },
      {
        $push: {
          liveBuffer: { role: 'assistant', content: response, ts: responseMetadata.initiateTime },
        },
        $set: {
          'state.lastBotMessageAt': Date.now(),
          updatedAt: Date.now(),
        },
        $inc: { version: 1 },
      },
    );

    if (!document) {
      throw new Error('Could not find any document to update with id ' + conversationId);
    }

    const responseEvent = responseMetadata.responseEvent as string;

    Emitter.emit(responseEvent, {
      ...event,
      responseMetadata: {
        ...event.responseMetadata,
        interaction: {
          eventType: 'message',
          channelId: document?.channelId,
          user: { id: 'internal' },
        },
      },
    });
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
