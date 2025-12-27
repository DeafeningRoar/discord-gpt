import type { AIDecisionPipelineEvent } from '../../../../../@types';

import { logger } from '../../../../services';

const handleProcessInputEvent = (event: AIDecisionPipelineEvent) => {
  logger.info('Received event at think controller', event);
};

export { handleProcessInputEvent };
