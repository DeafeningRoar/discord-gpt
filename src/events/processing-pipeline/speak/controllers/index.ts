import type { AIDecisionPipelineEvent } from '../../../../../@types';

import { eventLogger } from '../../../../services';
import { SPEAK_QUEUE_STATE } from '../../../../config/constants';
import { conversation, speakQueue } from '../../../../database';
import { SPEAK_DELAY_MS } from '../../../../config/env';

const handleProcessInputEvent = async (event: AIDecisionPipelineEvent) => {
  const logger = eventLogger(event);
  try {
    const {
      data: { id },
      context,
    } = event;

    const conversationModel = conversation.getModel();
    const speakQueueModel = speakQueue.getModel();

    const document = await conversationModel.findOneAndUpdate(
      {
        channelId: id,
        'state.active': true,
        source: context?.source,
      },
      [
        {
          $set: {
            'metadata.pendingSpeak': true,
            liveBuffer: {
              $concatArrays: ['$liveBuffer', '$pending'],
            },
            pending: [],
            updatedAt: '$$NOW',
            version: { $add: ['$version', 1] },
          },
        },
      ],
      { updatePipeline: true },
    );

    if (!document) {
      throw new Error(`Could not find active conversation with id ${id}`);
    }

    await speakQueueModel.findOneAndUpdate(
      { conversationId: document._id, status: SPEAK_QUEUE_STATE.PENDING },
      {
        $setOnInsert: {
          conversationId: document._id,
        },
        $set: {
          scheduledAt: Date.now() + Number(SPEAK_DELAY_MS),
          status: SPEAK_QUEUE_STATE.PENDING,
        },
      },
      { upsert: true, new: true },
    );

    logger.info('Updated conversation & speak queue with new live buffer', { conversationId: document._id });
  } catch (error: unknown) {
    const err = error as Error;

    logger.error('Error processing speak event', {
      message: err.message,
      cause: err.cause,
      stack: err.stack,
    });

    throw error;
  }
};

export { handleProcessInputEvent };
