import type { SpeakQueue } from '../../database/schemas/speak-queue';

import { CronJob } from 'cron';
import { Emitter, logger } from '../../services';

import { speakQueue } from '../../database';
import { EVENT_SOURCE, EVENTS, PIPELINE_EVENTS, SPEAK_QUEUE_STATE } from '../../config/constants';

const autoStart = false;

const speakQueueWorker = new CronJob(
  '*/1 * * * * *',
  async function () {
    try {
      const speakQueueModel = speakQueue.getModel();

      const documents = await speakQueueModel.find<SpeakQueue>({
        status: SPEAK_QUEUE_STATE.PENDING,
        scheduledAt: { $lte: Date.now() },
      });

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
          responseEvent: EVENTS.DISCORD_MESSAGE_PROCESSED,
        });
      });
    } catch (error: unknown) {
      const err = error as Error;

      logger.error('Error while processing speak queue', {
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
  },
};
