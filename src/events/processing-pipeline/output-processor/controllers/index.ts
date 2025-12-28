import type { AISchedulerResponseEvent } from '../../../../../@types';
import type { Conversation } from '../../../../database/schemas';

import { Emitter, eventLogger } from '../../../../services';
import { SPEAK_QUEUE_STATE } from '../../../../config/constants';
import { conversation, speakQueue } from '../../../../database';

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
    const speakQueueModel = speakQueue.getModel();

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
          'metadata.pendingSpeak': false,
          'state.lastBotMessageAt': Date.now(),
          updatedAt: Date.now(),
        },
        $inc: { version: 1 },
      },
      { new: true },
    );

    if (!document) {
      logger.info('Could not find any document to update with assistant response', {
        _id: conversationId,
        source: context?.source,
      });
      return;
    }

    await speakQueueModel.deleteMany({ conversationId, status: SPEAK_QUEUE_STATE.DONE });

    const responseEvent = responseMetadata.responseEvent as string;

    Emitter.emit(responseEvent, {
      ...event,
      data: { id: document?.channelId },
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

export { handleAgentResponseProcessed };
