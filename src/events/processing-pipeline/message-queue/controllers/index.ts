import type { AIPipelineEvent } from '../../../../../@types';

import { eventLogger } from '../../../../services';
import { conversation } from '../../../../database';

const step = 'message-queue';

const handleProcessInputEvent = async (event: AIPipelineEvent) => {
  const logger = eventLogger(event);
  try {
    const {
      data: { id, input, files },
      context,
    } = event;

    const model = conversation.getModel();

    const parsedFiles = {
      image: files?.image ? { url: files.image, expiresAt: files.imageExpiresAt } : undefined,
    };
    const ts = Date.now();

    const { matchedCount, modifiedCount, upsertedCount } = await model.updateOne(
      { channelId: id, 'state.active': true, source: context?.source },
      {
        $setOnInsert: {
          channelId: id,
          source: context?.source,
          summary: {},
          'state.lastBotMessageAt': Date.now(),
        },
        $set: {
          updatedAt: ts,
          'state.lastUserMessageAt': Date.now(),
          'state.active': true,
          'locks.thinking': false,
          'metadata.responseEvent': event.responseEvent,
        },
        $inc: { version: 1 },
        $push: {
          liveBuffer: {
            $each: [{ role: 'user', content: input, files: parsedFiles, ts }],
            $sort: { ts: 1 },
          },
        },
      },
      { upsert: true },
    );

    logger.info('Appended new user input into live buffer', {
      step,
      matchedCount,
      modifiedCount,
      upsertedCount,
    });
  } catch (err: unknown) {
    const error = err as Error;
    logger.error('Error appending new message into live buffer', {
      step,
      message: error.message,
      stack: error.stack,
    });

    throw err;
  }
};

export { handleProcessInputEvent };
