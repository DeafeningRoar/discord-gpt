import type { AIPipelineEvent } from '../../../../../@types';
import type { Conversation } from '../../../../database/schemas';

import { conversation } from '../../../../database';
import { eventLogger } from '../../../../services';

const handleProcessInputEvent = async (event: AIPipelineEvent) => {
  const logger = eventLogger(event);
  try {
    const {
      data: { id },
      context,
    } = event;

    const model = conversation.getModel();

    const document = await model.findOne<Conversation>({ channelId: id, 'state.active': true, source: context.source });

    if (!document) {
      logger.info('Could not find document to ignore pendings', {
        channelId: id,
        'state.active': true,
        source: context.source,
      });
      return;
    }

    const { matchedCount } = await model.updateOne(
      { _id: document._id, version: document.version },
      {
        $set: {
          pending: [],
          updatedAt: Date.now(),
        },
        $inc: {
          version: 1,
          'metadata.ignoreCount': 1,
        },
      },
    );

    if (matchedCount === 0) {
      logger.info('Document was previously modified, discarding changes in IGNORE');
      return;
    }

    logger.info('Discarded all pending messages', { id: document._id });
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
