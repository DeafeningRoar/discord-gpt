import type { AISchedulerResponseEvent } from '../../../../../@types';
import type { ResponseStream } from 'openai/lib/responses/ResponseStream';
import type { Conversation } from '../../../../database/schemas';

import { conversation } from '../../../../database';
import { Emitter, eventLogger } from '../../../../services';
import { getConversationConfig } from '../../helpers';
import { PIPELINE_EVENTS } from '../../../../config/constants';

const step = 'commit-gate';

const handleAgentThinkingProcessedEvent = async (event: AISchedulerResponseEvent<ResponseStream>) => {
  const logger = eventLogger(event);
  try {
    const {
      data: { conversationId, version },
      responseMetadata,
      context,
    } = event;
    const conversationModel = conversation.getModel();

    const {
      userSilenceTime = 2000,
      maxWaitTime = 10000,
      timeout = 15000,
    } = await getConversationConfig<{
      userSilenceTime: number;
      maxWaitTime: number;
      timeout: number;
    }>();

    const document = await conversationModel.findOneAndUpdate<Conversation>(
      {
        $and: [
          { _id: conversationId },
          { 'state.active': true },
          { source: context.source },
          {
            $expr: {
              $gte: [
                {
                  $subtract: ['$$NOW', '$state.lastUserMessageAt'],
                },
                userSilenceTime,
              ],
            },
          },
          {
            $or: [
              { version },
              {
                $expr: {
                  $gte: [
                    {
                      $subtract: ['$$NOW', '$state.lastBotMessageAt'],
                    },
                    maxWaitTime,
                  ],
                },
              },
            ],
          },
        ],
      },
      {
        $set: { 'state.lastBotMessageAt': responseMetadata.initiateTime },
        $inc: { version: 1 },
      },
    );

    if (!document) {
      logger.info('Conversation discarded', {
        step,
        conversationId,
      });

      await conversationModel.updateOne({ _id: conversationId }, { $set: { 'locks.thinking': false } });
      return;
    }

    logger.info('Using current conversation state for response', {
      step,
      conversationId,
      version,
      docVersion: document.version,
      maxWaitTime,
      timeout,
      userSilenceTime,
    });

    Emitter.emit(PIPELINE_EVENTS.OUTPUT_PROCESSOR_RESPONSE_PROCESSED, event);
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

export { handleAgentThinkingProcessedEvent };
