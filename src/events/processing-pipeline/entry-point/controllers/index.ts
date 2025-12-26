import type { AIPipelineEvent } from '../../../../../@types';

import { PIPELINE_EVENTS } from '../../../../config/constants';
import { Emitter } from '../../../../services';

const handleProcessInputEvent = (event: AIPipelineEvent) => {
  Emitter.emit(PIPELINE_EVENTS.MESSAGE_QUEUE_INPUT_RECEIVED, event);
};

export { handleProcessInputEvent };
