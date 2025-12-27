import type { AIPipelineEvent } from '../../../../../@types';

import { conversation } from '../../../../database';
import { logger } from '../../../../services';

const handleProcessInputEvent = async (event: AIPipelineEvent) => {
  try {
    const { data: { id }, context } = event;

    const model = conversation.getModel();
    const condition = { channelId: id, 'state.active': true, source: context?.source };

    const document = await model.updateOne(condition, {
      $set: {
        pending: [],
        updatedAt: Date.now(),
      },
      $inc: { version: 1 },
    });

    logger.info('Discarded all pending messages', { channelId: id, context, document });
  } catch (error: unknown) {
    const err = error as Error;

    logger.error('Error processing ignore event', {
      message: err.message,
      cause: err.cause,
      stack: err.stack,
    });

    throw error;
  }
};

export { handleProcessInputEvent };
