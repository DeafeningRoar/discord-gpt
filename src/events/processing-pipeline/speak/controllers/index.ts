import type { AIDecisionPipelineEvent } from '../../../../../@types';

import { Emitter } from '../../../../services';
import { PIPELINE_EVENTS } from '../../../../config/constants';

const handleProcessInputEvent = (event: AIDecisionPipelineEvent) => {
  Emitter.emit(PIPELINE_EVENTS.CONTEXT_COMPOSER_INPUT_PROCESSED, event);
};

export { handleProcessInputEvent };
