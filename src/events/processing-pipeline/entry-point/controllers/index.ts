import type { AIPipelineEvent } from '../../../../../@types';
import type { Configuration } from '../../../../database/schemas/configuration';

import { PIPELINE_EVENTS } from '../../../../config/constants';
import { configuration } from '../../../../database';
import { Emitter, eventLogger } from '../../../../services';

const handleProcessInputEvent = async (event: AIPipelineEvent) => {
  const logger = eventLogger(event);
  try {
    const configsModel = configuration.getModel();

    const allowedChannels = await configsModel.findOne<Configuration>(
      { name: 'allowed_channels' },
    );

    if (allowedChannels) {
      const channelIds = allowedChannels.config.channelIds as string[];

      if (channelIds.includes(event.data.id)) {
        Emitter.emit(PIPELINE_EVENTS.MESSAGE_QUEUE_INPUT_RECEIVED, event);
      } else {
        logger.info('Channel not allowed', { channelId: event.data.id });
        return;
      }
    }

    Emitter.emit(PIPELINE_EVENTS.MESSAGE_QUEUE_INPUT_RECEIVED, event);
  } catch (error: unknown) {
    const err = error as Error;

    logger.error('Error in event entry point', {
      message: err.message,
      cause: err.cause,
      stack: err.stack,
    });

    throw error;
  }
};

export { handleProcessInputEvent };
