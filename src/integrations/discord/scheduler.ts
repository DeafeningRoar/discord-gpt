import type { SpeakQueue } from '../../database/schemas';

import { CronJob } from 'cron';
import { Emitter, logger } from '../../services';

import { mongoose, speakQueue, conversation } from '../../database';
import { EVENT_SOURCE, EVENTS, PIPELINE_EVENTS, SPEAK_QUEUE_STATE } from '../../config/constants';
import { getConversationConfig } from '../../events/processing-pipeline/helpers';

const autoStart = false;

const speakQueueWorker = new CronJob(
  '*/1 * * * * *',
  async function () {
    try {
      if (mongoose.client?.connection?.readyState !== 1) {
        logger.info('Mongoose client not started, skipping speak queue check');
        return;
      }

      const speakQueueModel = speakQueue.getModel();

      const documents = await speakQueueModel.find<SpeakQueue>({ status: SPEAK_QUEUE_STATE.PENDING });

      if (!documents.length) {
        return;
      }

      const updatedDocuments = (
        await Promise.all(
          documents.map(async (doc) => {
            const { matchedCount } = await speakQueueModel.updateOne(
              { _id: doc._id, status: SPEAK_QUEUE_STATE.PENDING },
              {
                $set: {
                  status: SPEAK_QUEUE_STATE.CLAIMED,
                  claimedAt: Date.now(),
                },
              },
            );

            if (matchedCount === 0) {
              return null;
            }

            return doc;
          }),
        )
      ).filter(i => !!i);

      logger.info('Updated speak queue documents, sending to process', {
        count: updatedDocuments.length,
      });

      updatedDocuments.forEach((doc) => {
        Emitter.emit(PIPELINE_EVENTS.CONTEXT_COMPOSER_INPUT_PROCESSED, {
          id: doc.conversationId,
          data: { conversationId: doc.conversationId },
          context: { source: EVENT_SOURCE.DISCORD },
          responseEvent: EVENTS.DISCORD_MESSAGE_PROCESSED_STREAM,
        });
      });
    } catch (error: unknown) {
      const err = error as Error;

      logger.error('Error while processing speak queues', {
        message: err.message,
        cause: err.cause,
        stack: err.stack,
      });
    }
  },
  null,
  autoStart,
);

const speakQueueRecoveryWorker = new CronJob(
  '*/1 * * * * *',
  async function () {
    try {
      if (mongoose.client?.connection?.readyState !== 1) {
        logger.info('Mongoose client not started, skipping speak queue check');
        return;
      }

      const speakQueueModel = speakQueue.getModel();

      const { matchedCount } = await speakQueueModel.updateMany(
        {
          status: SPEAK_QUEUE_STATE.CLAIMED,
          claimedAt: { $lte: Date.now() - 5000 },
        },
        { $set: { status: SPEAK_QUEUE_STATE.PENDING } },
      );

      if (matchedCount === 0) return;

      logger.info(`Recovered ${matchedCount} speak queues stuck in CLAIMED status`);
    } catch (error: unknown) {
      const err = error as Error;

      logger.error('Error while processing claimed speak queues', {
        message: err.message,
        cause: err.cause,
        stack: err.stack,
      });
    }
  },
  null,
  autoStart,
);

const conversationStateWorker = new CronJob(
  '* */5 * * * *',
  async function () {
    try {
      if (mongoose.client?.connection?.readyState !== 1) {
        logger.info('Mongoose client not started, skipping conversation check');
        return;
      }

      const DEFAULT_TTL = 60 * 60 * 1000; // 1 hour
      const conversationModel = conversation.getModel();

      const conversationConfig = await getConversationConfig<{ ttl: number }>();

      if (!conversationConfig) {
        logger.info('No configuration found for conversations, using default values', { TTL: DEFAULT_TTL });
      }

      const conversationTTL = (conversationConfig.ttl || DEFAULT_TTL) as number;

      const { matchedCount } = await conversationModel.updateMany(
        {
          source: EVENT_SOURCE.DISCORD,
          'state.active': true,
          'state.lastUserMessageAt': { $lte: Date.now() - conversationTTL },
        },
        {
          $set: {
            'state.active': false,
            updatedAt: Date.now(),
          },
          $inc: { version: 1 },
        },
      );

      if (matchedCount === 0) return;

      logger.info(`Marked ${matchedCount} conversations as inactive`);
    } catch (error: unknown) {
      const err = error as Error;

      logger.error('Error while processing conversations state', {
        message: err.message,
        cause: err.cause,
        stack: err.stack,
      });
    }
  },
  null,
  autoStart,
);

export default {
  start: () => {
    speakQueueWorker.start();
    conversationStateWorker.start();

    speakQueueRecoveryWorker.start();
  },
};
