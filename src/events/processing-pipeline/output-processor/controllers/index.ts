import type { AISchedulerResponseEvent } from '../../../../../@types';
import type { Conversation } from '../../../../database/schemas';
import type { ResponseStream } from 'openai/lib/responses/ResponseStream';

import { Emitter, eventLogger } from '../../../../services';
import { SPEAK_QUEUE_STATE } from '../../../../config/constants';
import { conversation, speakQueue } from '../../../../database';
import { promisifyAgentStream } from '../../helpers';

const handleAgentResponseProcessed = async (event: AISchedulerResponseEvent<ResponseStream>) => {
  const logger = eventLogger(event);
  try {
    const {
      data: { conversationId },
      response: streamResponse,
      context,
      responseMetadata,
    } = event;
    const conversationModel = conversation.getModel();
    const speakQueueModel = speakQueue.getModel();

    const document = await conversationModel.findById(conversationId);

    promisifyAgentStream(streamResponse)
      .then(async (response) => {
        const document = await conversationModel.findOneAndUpdate<Conversation>(
          {
            _id: conversationId,
            source: context?.source,
          },
          {
            $push: {
              liveBuffer: { role: 'assistant', content: response || '', ts: responseMetadata.initiateTime },
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
      })
      .catch((error) => {
        const err = error as Error;

        logger.error('Error handling streamed agent output', {
          message: err.message,
          cause: err.cause,
          stack: err.stack,
        });
      });

    const responseEvent = responseMetadata.responseEvent as string;

    logger.info('Emitted response event for conversation', { conversationId });

    Emitter.emit(responseEvent, {
      ...event,
      data: { id: document?.channelId },
    });
  } catch (error: unknown) {
    const err = error as Error;

    logger.error('Error handling agent output', {
      message: err.message,
      cause: err.cause,
      stack: err.stack,
    });

    throw error;
  }
};

export { handleAgentResponseProcessed };
