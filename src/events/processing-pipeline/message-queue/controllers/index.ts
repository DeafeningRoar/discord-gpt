import type { AIPipelineEvent } from '../../../../../@types';
import type { Conversation } from '../../../../database/schemas';

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
          lastUserMessageAt: Date.now(),
        },
        summary: {},
        liveBuffer: [],
        version: 1,
      },
      $set: {
        updatedAt: ts,
      },
      $push: {
        pending: { role: 'user', content: input, ts },
      },
    },
    { upsert: true, new: true },
  );

  const hasExceededPendingSize = document.pending.length >= 10;

  logger.info('Checking pending queue', { pendingSize: document.pending.length });

  if (hasExceededPendingSize) {
    logger.info('Exceeded pending size, sending messages to decision processing');
    return Emitter.emit(PIPELINE_EVENTS.DECISION_INPUT_PROCESSED, event);
  }

  return Emitter.emit(PIPELINE_EVENTS.DECISION_INPUT_PROCESSED, event);
};

export { handleProcessInputEvent };
