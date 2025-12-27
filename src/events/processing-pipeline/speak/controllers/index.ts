import type { AIDecisionPipelineEvent } from '../../../../../@types';
import type { Conversation } from '../../../../database/schemas/conversation';

import { Emitter, logger } from '../../../../services';
import { PIPELINE_EVENTS } from '../../../../config/constants';
import { conversation } from '../../../../database';

const handleProcessInputEvent = async (event: AIDecisionPipelineEvent) => {
  try {
    const {
      data: { id },
      context,
    } = event;

    const model = conversation.getModel();

    const document = await model.findOne<Conversation>({
      channelId: id,
      'state.active': true,
      source: context?.source,
    });

    if (!document) {
      throw new Error(`Could not find active conversation with id ${id}`);
    }

    const { state } = document;
    const lastBotMessage = state.lastBotMessageAt?.getTime() || 0;

    if (Date.now() - lastBotMessage <= 5_000) {
      logger.info('Promoted event to THINK due to last reply being less than 5 seconds ago');
      return Emitter.emit(PIPELINE_EVENTS.THINK_INPUT_PROCESSED, event);
    }

    await model.updateOne(
      {
        channelId: id,
        'state.active': true,
        source: context?.source,
      },
      [
        {
          $set: {
            liveBuffer: {
              $concatArrays: ['$liveBuffer', '$pending'],
            },
            pending: [],
            'state.active': true,
            updatedAt: '$$NOW',
            version: { $add: ['$version', 1] },
          },
        },
      ],
      { updatePipeline: true },
    );

    logger.info('Updated current conversation document');

    Emitter.emit(PIPELINE_EVENTS.CONTEXT_COMPOSER_INPUT_PROCESSED, event);
  } catch (error: unknown) {
    const err = error as Error;

    logger.error('Error processing speak event', {
      message: err.message,
      cause: err.cause,
      stack: err.stack,
    });

    throw error;
  }
};

export { handleProcessInputEvent };
