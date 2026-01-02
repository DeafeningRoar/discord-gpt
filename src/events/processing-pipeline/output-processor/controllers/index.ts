import type { AISchedulerResponseEvent } from '../../../../../@types';
import type { Conversation } from '../../../../database/schemas';
import type { ResponseStream } from 'openai/lib/responses/ResponseStream';

import { Emitter, eventLogger } from '../../../../services';
import { conversation } from '../../../../database';
import { promisifyAgentStream } from '../../helpers';

const step = 'output-processor';

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

    const document = await conversationModel.findById(conversationId);

    promisifyAgentStream(streamResponse)
      .then(async (response) => {
        const ts = Date.now();
        const { output, tokens } = response;
        const document = await conversationModel.findOneAndUpdate<Conversation>(
          {
            _id: conversationId,
            source: context?.source,
            'state.active': true,
          },
          {
            $push: {
              liveBuffer: {
                $each: [{ role: 'assistant', content: output || 'Error generating response', ts: responseMetadata.initiateTime }],
                $sort: { ts: 1 },
              },
            },
            $set: {
              'state.lastBotMessageAt': ts,
              updatedAt: ts,
              'locks.speakInFlight': false,
              'metadata.tokens': tokens,
            },
          },
          { new: true },
        );

        if (!document) {
          logger.info('Could not find any document to update with assistant response', {
            step,
            _id: conversationId,
            source: context?.source,
          });
          return;
        }
      })
      .catch((error) => {
        const err = error as Error;

        logger.error('Error handling streamed agent output', {
          step,
          message: err.message,
          cause: err.cause,
          stack: err.stack,
        });
      });

    const responseEvent = responseMetadata.responseEvent as string;

    logger.info('Emitted response event for conversation', { step, conversationId });

    Emitter.emit(responseEvent, {
      ...event,
      data: { id: document?.channelId },
    });
  } catch (error: unknown) {
    const err = error as Error;

    logger.error('Error handling agent output', {
      step,
      message: err.message,
      cause: err.cause,
      stack: err.stack,
    });

    throw error;
  }
};

export { handleAgentResponseProcessed };
