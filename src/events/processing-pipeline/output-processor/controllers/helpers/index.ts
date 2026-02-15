import type { ResponseStream } from 'openai/lib/responses/ResponseStream';
import type { Conversation } from '../../../../../database/schemas';
import type { Model, Document } from 'mongoose';
import type { logger as Logger } from '../../../../../services';

import { promisifyAgentStream } from '../../../helpers';
import { Response } from 'openai/resources/responses/responses';

const handleStreamResponse = ({
  streamResponse,
  conversationModel,
  conversationId,
  context,
  responseMetadata,
  step,
  logger,
}: {
  streamResponse: ResponseStream;
  conversationModel: Model<Document>;
  conversationId: string;
  context: Record<string, unknown>;
  responseMetadata: Record<string, unknown>;
  step: string;
  logger: typeof Logger;
}) => {
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
              $each: [
                {
                  role: 'assistant',
                  content: output || 'Error generating response',
                  ts: responseMetadata.initiateTime,
                },
              ],
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
};

const handleNonStreamResponse = async ({
  response,
  conversationModel,
  conversationId,
  context,
  responseMetadata,
  step,
  logger,
}: {
  response: Response;
  conversationModel: Model<Document>;
  conversationId: string;
  context: Record<string, unknown>;
  responseMetadata: Record<string, unknown>;
  step: string;
  logger: typeof Logger;
}) => {
  const ts = Date.now();
  const { output, usage } = response;
  const document = await conversationModel.findOneAndUpdate<Conversation>(
    {
      _id: conversationId,
      source: context?.source,
      'state.active': true,
    },
    {
      $push: {
        liveBuffer: {
          $each: [
            {
              role: 'assistant',
              content: output || 'Error generating response',
              ts: responseMetadata.initiateTime,
            },
          ],
          $sort: { ts: 1 },
        },
      },
      $set: {
        'state.lastBotMessageAt': ts,
        updatedAt: ts,
        'locks.speakInFlight': false,
        'metadata.tokens': usage?.total_tokens,
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
};

export { handleStreamResponse, handleNonStreamResponse };
