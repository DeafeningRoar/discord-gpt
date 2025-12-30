import type { AIPipelineEvent } from '../../../../../@types';
import type { Conversation } from '../../../../database/schemas';

import { PIPELINE_EVENTS } from '../../../../config/constants';
import { Emitter, eventLogger } from '../../../../services';
import { conversation } from '../../../../database';
import { getConversationConfig } from '../../helpers';

const releasePendingLock = async (_id: unknown) => {
  const model = conversation.getModel();
  return await model.updateOne(
    { _id, 'locks.pending': { $ne: false } },
    { $set: { 'locks.pending': false, 'metadata.pendingStartAt': null } },
  );
};

const handleProcessInputEvent = async (event: AIPipelineEvent) => {
  const logger = eventLogger(event);
  const {
    data: { id, input, files },
    context,
  } = event;

  const model = conversation.getModel();

  const ts = Date.now();

  const parsedFiles = {
    image: files?.image ? { url: files.image, expiresAt: files.imageExpiresAt } : undefined,
  };

  const speakConfigs = await getConversationConfig<{ maxPendingQueueSize: number }>();
  const { maxPendingQueueSize = 10 } = speakConfigs || {};

  const document = await model.findOneAndUpdate<Conversation>(
    { channelId: id, 'state.active': true, source: context?.source },
    {
      $setOnInsert: {
        channelId: id,
        source: context?.source,
        metadata: { responseEvent: event.responseEvent, pendingStartAt: null },
        summary: {},
        liveBuffer: [],
        version: 1,
      },
      $set: {
        updatedAt: ts,
        'state.lastUserMessageAt': Date.now(),
        'state.active': true,
      },
      $push: {
        pending: { role: 'user', content: input, files: parsedFiles, ts },
      },
    },
    { upsert: true, new: true },
  );

  logger.info('Checking pending queue', { pendingSize: document.pending.length });

  if (document.pending.length > maxPendingQueueSize) {
    logger.info('Exceeded pending size, sending messages to decision processing', { id: document._id });

    const { matchedCount } = await releasePendingLock(document._id);

    if (matchedCount !== 0) {
      return Emitter.emit(PIPELINE_EVENTS.DECISION_INPUT_PROCESSED, event);
    }
  }

  if (!document.locks.pending) {
    await model.updateOne(
      { _id: document._id },
      {
        $set: {
          'locks.pending': true,
          'metadata.pendingStartAt': Date.now(),
        },
      },
    );
  }

  logger.info(`Updated pendingScheduledAt for conversation`, {
    id: document._id,
  });
};

export { handleProcessInputEvent };
