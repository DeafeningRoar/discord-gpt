import type { AIPipelineEvent } from '../../../../../@types';

import { PIPELINE_EVENTS } from '../../../../config/constants';
import { Emitter, eventLogger } from '../../../../services';
import { getAllowedChannels } from '../../helpers';

const handleProcessInputEvent = async (event: AIPipelineEvent) => {
  const logger = eventLogger(event);
  try {
    const config = await getAllowedChannels<{ channelIds?: string[] }>();

    if (config.channelIds) {
      const { channelIds } = config;

      if (channelIds.includes(event.data.id)) {
        Emitter.emit(PIPELINE_EVENTS.MESSAGE_INGRESS_INPUT_RECEIVED, event);
      } else {
        logger.info('Channel not allowed', { channelId: event.data.id });
      }

      return;
    }

    Emitter.emit(PIPELINE_EVENTS.MESSAGE_INGRESS_INPUT_RECEIVED, event);
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
