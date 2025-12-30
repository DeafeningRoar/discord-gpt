import type { Conversation } from '../../database/schemas';

import { CronJob } from 'cron';
import { Emitter, logger } from '../../services';

import { mongoose, conversation } from '../../database';
import { PIPELINE_EVENTS } from '../../config/constants';
import { getConversationConfig } from '../../events/processing-pipeline/helpers';

const autoStart = false;

const pendingQueueWorker = new CronJob(
  '*/1 * * * * *',
  async function () {
    try {
      if (mongoose.client?.connection?.readyState !== 1) {
        logger.info('Mongoose client not started, skipping pending queue check');
        return;
      }

      const conversationModel = conversation.getModel();

      const speakConfigs = await getConversationConfig<{ processingDelay: number; maxProcessingDelay: number }>();
      const { processingDelay = 1000, maxProcessingDelay = 15000 } = speakConfigs || {};

      const ts = Date.now();
      const documents = await conversationModel.find<Conversation>({
        $and: [
          { 'state.active': true },
          { 'locks.pending': true },
          {
            $or: [
              { 'state.lastUserMessageAt': { $lte: ts - processingDelay } },
              { 'metadata.pendingStartAt': { $lte: ts - maxProcessingDelay } },
            ],
          },
        ],
      });

      if (!documents.length) {
        return;
      }

      logger.info(`Processing ${documents.length} conversations with pending messages`);

      await Promise.all(
        documents.map(async (doc) => {
          const updatedDoc = await conversationModel.findOneAndUpdate(
            {
              _id: doc._id,
              'locks.pending': true,
              $or: [
                { 'state.lastUserMessageAt': { $lte: ts - processingDelay } },
                { 'metadata.pendingStartAt': { $lte: ts - maxProcessingDelay } },
              ],
            },
            {
              $set: {
                'locks.pending': false,
                'metadata.pendingStartAt': null,
              },
            },
            { new: true },
          );

          if (updatedDoc) {
            Emitter.emit(PIPELINE_EVENTS.DECISION_INPUT_PROCESSED, {
              id: doc._id,
              data: { id: doc.channelId },
              context: { source: doc.source },
              responseEvent: doc.metadata.responseEvent,
            });
          }
        }),
      );
    } catch (error: unknown) {
      const err = error as Error;

      logger.error('Error while processing pending queues', {
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
    pendingQueueWorker.start();
  },
};
