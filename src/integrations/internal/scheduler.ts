import type { Conversation } from '../../database/schemas';

import { CronJob } from 'cron';
import { Emitter, eventLogger } from '../../services';

import { mongoose, conversation } from '../../database';
import { PIPELINE_EVENTS } from '../../config/constants';
import { getConversationConfig } from '../../events/processing-pipeline/helpers';

const autoStart = false;

const conversationStateWorker = new CronJob(
  '*/2 * * * * *',
  async function () {
    const logger = eventLogger({ id: 'conversationStateWorker' });
    try {
      if (mongoose.client?.connection?.readyState !== 1) {
        logger.info('Mongoose client not started, skipping pending queue check');
        return;
      }

      const conversationModel = conversation.getModel();
      const speakConfigs = await getConversationConfig<{ timeout: number; userSilenceTime: number }>();
      const { timeout = 15000, userSilenceTime = 2000 } = speakConfigs || {};

      const filterCondition = {
        'state.active': true,
        'locks.thinking': false,
        $expr: {
          $and: [
            {
              $or: [
                { $lt: ['state.lastBotMessageAt', '$state.lastUserMessageAt'] },
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
              ],
            },
            {
              $lte: [{ $subtract: ['$$NOW', '$state.lastUserMessageAt'] }, timeout],
            },
          ],
        },
      };

      const documents = await conversationModel.find<Conversation>(filterCondition);

      if (!documents.length) {
        return;
      }

      logger.info(`Attempting to update ${documents.length} conversations state`);

      await Promise.all(
        documents.map(async (doc) => {
          const updatedDoc = await conversationModel.findOneAndUpdate(
            filterCondition,
            { $set: { 'locks.thinking': true } },
            { new: true },
          );

          if (updatedDoc) {
            Emitter.emit(PIPELINE_EVENTS.THINK_INPUT_PROCESSED, {
              id: doc._id,
              data: { id: doc.channelId, conversationId: doc._id },
              context: { source: doc.source },
              responseEvent: doc.metadata.responseEvent,
            });
          }
        }),
      );
    } catch (error: unknown) {
      const err = error as Error;

      logger.error('Error updating conversations state', {
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
    conversationStateWorker.start();
  },
};
