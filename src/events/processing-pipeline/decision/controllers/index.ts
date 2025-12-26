import { Emitter } from '../../../../services';
import { PIPELINE_EVENTS } from '../../../../config/constants';

// eslint-disable-next-line
const handleProcessInputEvent = (event: any) => {
  Emitter.emit(PIPELINE_EVENTS.SPEAK_INPUT_PROCESSED, event);
};

export { handleProcessInputEvent };
