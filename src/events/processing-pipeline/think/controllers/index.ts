import type { AIDecisionPipelineEvent } from '../../../../../@types';
import type { Conversation } from '../../../../database/schemas/conversation';

import { conversation } from '../../../../database';
import { eventLogger } from '../../../../services';

const handleProcessInputEvent = async (event: AIDecisionPipelineEvent) => {
  const logger = eventLogger(event);
  try {
    const {
      data: { id },
      context,
    } = event;

    const conversationModel = conversation.getModel();

    const document = await conversationModel.findOne<Conversation>({
      channelId: id,
      'state.active': true,
      context: context.source,
    });

    if (!document) {
      throw new Error('Could not find document with channelId ' + id);
    }

    const { matchedCount } = await conversationModel.updateOne(
      { _id: document._id, version: document.version },
      [
        {
          $set: {
            liveBuffer: {
              $concatArrays: ['$liveBuffer', '$pending'],
            },
            pending: [],
            updatedAt: '$$NOW',
            version: { $add: ['$version', 1] },
            'metadata.thinkCount': { $add: ['$metadata.thinkCount', 1] },
          },
        },
      ],
      { updatePipeline: true },
    );

    if (matchedCount === 0) {
      logger.info('Document has been previously updated, discarding changes in THINK');
    }
  } catch (error: unknown) {
    const err = error as Error;

    logger.error('Error processing think event', {
      message: err.message,
      cause: err.cause,
      stack: err.stack,
    });
  }
};

export { handleProcessInputEvent };
