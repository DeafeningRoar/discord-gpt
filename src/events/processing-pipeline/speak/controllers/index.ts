import type { AIDecisionPipelineEvent } from '../../../../../@types';
import type { Conversation, Configuration } from '../../../../database/schemas';

import { eventLogger } from '../../../../services';
import { SPEAK_QUEUE_STATE } from '../../../../config/constants';
import { configuration, conversation, speakQueue } from '../../../../database';

const handleProcessInputEvent = async (event: AIDecisionPipelineEvent) => {
  const logger = eventLogger(event);
  try {
    const {
      data: { id },
      context,
    } = event;

    const conversationModel = conversation.getModel();
    const speakQueueModel = speakQueue.getModel();
    const configsModel = configuration.getModel();

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
            'state.lastUserMessageAt': '$$NOW',
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

    const speakConfigs = await configsModel.findOne<Configuration>({ name: 'conversation_settings' });

    const { maxSpeakDelay = 5000, softSpeakDelay = 1500 } = speakConfigs?.config || {};

    const ts = Date.now();
    if (!document) {
      logger.info('Could not find conversation ready for speak', {
        channelId: id,
        'state.active': true,
        source: context?.source,
        'metadata.pendingSpeak': false,
      });

      const tempDoc = await conversationModel.findOne<Conversation>({
        channelId: id,
        'state.active': true,
        source: context?.source,
      });

      if (!tempDoc) return;

      const { matchedCount } = await speakQueueModel.updateOne(
        { conversationId: tempDoc._id, status: SPEAK_QUEUE_STATE.PENDING },
        [
          {
            $set: {
              scheduledAt: {
                $min: [
                  { $add: ['$createdAt', Number(maxSpeakDelay)] },
                  { $add: ['$$NOW', Number(softSpeakDelay)] },
                ],
              },
            },
          },
        ],
        { updatePipeline: true },
      );

      if (matchedCount !== 0) {
        logger.info('Successfully debounced speak event', { conversationId: tempDoc._id });
      }
    } else {
      await speakQueueModel.findOneAndUpdate(
        { conversationId: document._id, status: SPEAK_QUEUE_STATE.PENDING },
        {
          $setOnInsert: {
            conversationId: document._id,
          },
          $set: {
            scheduledAt: ts + Number(softSpeakDelay),
            status: SPEAK_QUEUE_STATE.PENDING,
          },
        },
        { upsert: true, new: true },
      );

      logger.info('Updated conversation & speak queue with new live buffer', { conversationId: document._id });
    }
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
