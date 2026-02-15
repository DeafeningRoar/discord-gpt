import type { Conversation } from '../../database/schemas';

import { CronJob } from 'cron';

import { eventLogger } from '../../services';
import { conversation, mongoose } from '../../database';
import { getConversationConfig } from '../../events/processing-pipeline/helpers';
// import { PIPELINE_EVENTS } from '../../config/constants';

const awaitingSpeakRecoveryWorker = new CronJob(
  '*/10 * * * * *',
  async function () {
    const logger = eventLogger({ id: 'speak-recovery-worker' });
    try {
      if (mongoose.client?.connection.readyState !== 1) {
        logger.info('Mongodb connection is not ready, skipping');
        return;
      }

      const conversationModel = conversation.getModel();
      const { timeout, maxWaitTime } = await getConversationConfig<{ maxWaitTime: number; timeout: number }>();

      const ts = Date.now();
      const documents = await conversationModel.find<Conversation>({
        'locks.speakInFlight': true,
        'state.lastBotMessageAt': { $lt: Math.max(ts - timeout, ts - maxWaitTime * 1.5) },
      });

      if (!documents?.length) {
        return;
      }

      await Promise.all(
        documents.map(async (doc) => {
          const updated = await conversationModel.findOneAndUpdate<Conversation>(
            {
              _id: doc._id,
              'locks.speakInFlight': true,
              'state.lastBotMessageAt': { $lt: Math.max(ts - timeout, ts - maxWaitTime * 1.5) },
            },
            {
              'locks.speakInFlight': false,
              'state.lastUserMessageAt': ts,
              $inc: { version: 1 },
              $push: {
                liveBuffer: {
                  $each: [{ role: 'system', content: 'This conversation was recovered from an error.', files: {}, ts }],
                  $sort: { ts: 1 },
                },
              },
            },
            { new: true },
          );

          if (!updated) return;

          logger.info('Recovered conversation from speak in flight deadlock', { _id: updated._id });
          // Emitter.emit(PIPELINE_EVENTS.THINK_INPUT_PROCESSED, {
          //   id: updated._id,
          //   data: { id: updated.channelId, conversationId: updated._id, version: updated.version },
          //   context: { source: updated.source },
          //   responseEvent: updated.metadata.responseEvent,
          // });
        }),
      );
    } catch (err: unknown) {
      const error = err as Error;

      logger.error('Error recovering awaiting speak conversations', {
        message: error.message,
        cause: error.cause,
        stack: error.stack,
      });
    }
  },
  null,
  false,
);

export default () => {
  awaitingSpeakRecoveryWorker.start();
};
