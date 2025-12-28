import type { AIPipelineEvent } from '../../../../../@types';
import type { Conversation } from '../../../../database/schemas/conversation';

import { PIPELINE_EVENTS } from '../../../../config/constants';
import { Emitter, eventLogger } from '../../../../services';
import { conversation } from '../../../../database';

const handleProcessInputEvent = async (event: AIPipelineEvent) => {
  const logger = eventLogger(event);
  const { data: { id, input }, context } = event;

  const model = conversation.getModel();

  const ts = Date.now();

  const document = await model.findOneAndUpdate<Conversation>(
    { channelId: id, 'state.active': true, source: context?.source },
    {
      $setOnInsert: {
        channelId: id,
        source: context?.source,
        state: {
          active: true,
        },
        summary: {},
        liveBuffer: [],
        version: 1,
      },
      $set: {
        updatedAt: ts,
      },
      $push: {
        pending: { role: 'user', content: input },
      },
    },
    { upsert: true, new: true },
  );

  const lastUserMessage = document.state.lastUserMessageAt?.getTime() || 0;
  const hasRecentMessages = (Date.now() - lastUserMessage) < 10_000;
  const hasExceededPendingSize = document.pending.length >= 10;

  logger.info('Checking pending queue', {
    hasRecentMessages,
    pendingSize: document.pending.length,
  });

  if (!hasRecentMessages) {
    logger.info('No recent messages, sending pending queue to decision processing');
    return Emitter.emit(PIPELINE_EVENTS.DECISION_INPUT_PROCESSED, event);
  }

  if (hasExceededPendingSize) {
    logger.info('Exceeded pending size, sending messages to decision processing');
    return Emitter.emit(PIPELINE_EVENTS.DECISION_INPUT_PROCESSED, event);
  }

  logger.info('Silently updated pending queue');
};

export { handleProcessInputEvent };
