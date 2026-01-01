import type { AIPipelineEvent } from '../../../../../@types';
import type { Conversation } from '../../../../database/schemas';

import { Emitter, eventLogger } from '../../../../services';
import { conversation } from '../../../../database';
import { PIPELINE_EVENTS } from '../../../../config/constants';

const step = 'message-ingress';

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

    const doc = await model.findOneAndUpdate<Conversation>(
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
      { upsert: true, new: true },
    );

    logger.info('Appended new user input into live buffer', {
      step,
      conversationId: doc._id,
    });

    Emitter.emit(PIPELINE_EVENTS.THINK_INPUT_PROCESSED, {
      id: doc._id,
      data: { id: doc.channelId, conversationId: doc._id, version: doc.version },
      context: { source: doc.source },
      responseEvent: doc.metadata.responseEvent,
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
