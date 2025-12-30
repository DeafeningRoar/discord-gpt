import type { AIDecisionPipelineEvent } from '../../../../../@types';

import { eventLogger } from '../../../../services';
import { SPEAK_QUEUE_STATE } from '../../../../config/constants';
import { conversation, speakQueue } from '../../../../database';

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
        'metadata.pendingSpeak': false,
      },
      [
        {
          $set: {
            'metadata.pendingSpeak': true,
            'metadata.thinkCount': 0,
            'metadata.ignoreCount': 0,
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
      logger.info('Could not find conversation ready for speak', {
        channelId: id,
        'state.active': true,
        source: context?.source,
        'metadata.pendingSpeak': false,
      });
      return;
    }

    await speakQueueModel.findOneAndUpdate(
      { conversationId: document._id, status: SPEAK_QUEUE_STATE.PENDING },
      {
        $setOnInsert: {
          conversationId: document._id,
        },
        $set: { status: SPEAK_QUEUE_STATE.PENDING },
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
