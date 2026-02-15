import type { AISchedulerResponseEvent } from '../../../../../@types';
import type { ResponseStream } from 'openai/lib/responses/ResponseStream';
import type { Response } from 'openai/resources/responses/responses';
import type { Model, Document } from 'mongoose';

import { Emitter, eventLogger } from '../../../../services';
import { conversation } from '../../../../database';

import { handleNonStreamResponse, handleStreamResponse } from './helpers';

const step = 'output-processor';

const handleAgentResponseProcessed = async (event: AISchedulerResponseEvent<Response | ResponseStream>) => {
  const logger = eventLogger(event);
  try {
    const {
      data: { conversationId },
      response: agentResponse,
      context,
      responseMetadata,
    } = event;
    const conversationModel = conversation.getModel();

    const document = await conversationModel.findById(conversationId);

    if (responseMetadata.stream) {
      handleStreamResponse({
        streamResponse: agentResponse as ResponseStream,
        conversationModel: conversationModel as unknown as Model<Document>,
        conversationId,
        context,
        responseMetadata,
        step,
        logger,
      });
    } else {
      await handleNonStreamResponse({
        response: agentResponse as Response,
        conversationModel: conversationModel as unknown as Model<Document>,
        conversationId,
        context,
        responseMetadata,
        step,
        logger,
      });
    }

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
