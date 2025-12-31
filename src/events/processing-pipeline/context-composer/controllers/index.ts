import type { AISchedulerEvent } from '../../../../../@types';
import type { Conversation, SpeakQueue } from '../../../../database/schemas';

import { Emitter, eventLogger } from '../../../../services';
import { PIPELINE_EVENTS, SOURCE_EVENTS, SPEAK_QUEUE_STATE } from '../../../../config/constants';
import { conversation, speakQueue } from '../../../../database';
import { getAgentConfig, AGENT_TYPES } from '../../helpers';

const buildContext = (document: Conversation, systemPrompt: string) => [
  { role: 'system', content: systemPrompt },
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
    .map(({ role, content, files }) => {
      const { url, expiresAt } = files.image || {};

      if (typeof expiresAt !== 'undefined' && Date.now() >= expiresAt?.getTime()) {
        return { role, content: `${content}\n\n**Expired Image URL <${url}>**`, files: {} };
      }

      return { role, content, files: { image: url } };
    }),
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

    const document = await conversationModel.findOne<Conversation>({
      _id: conversationId,
      source,
      'metadata.pendingSpeak': true,
    });

    if (!document) {
      logger.info('Could not find document to prepare for agent', {
        _id: conversationId,
        source,
        'metadata.pendingSpeak': true,
      });
      return;
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

    const agentConfig = await getAgentConfig(AGENT_TYPES.CHAT);

    if (inProgressEvent) {
      Emitter.emit(SOURCE_EVENTS[source].RESPONSE_IN_PROGRESS, { data: { channelId: document.channelId } });
    }

    Emitter.emit(PIPELINE_EVENTS.PROCESS_AGENT_RESPONSE, {
      ...event,
      processedInput: { input: buildContext(document, agentConfig.prompt), model: agentConfig.model },
      responseMetadata: { responseEvent: event.responseEvent, stream: true },
      responseEvent: PIPELINE_EVENTS.OUTPUT_PROCESSOR_RESPONSE_PROCESSED,
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

export { handleProcessInputEvent };
