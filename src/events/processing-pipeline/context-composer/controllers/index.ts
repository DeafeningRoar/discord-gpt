import { Emitter } from '../../../../services';
import { EVENTS } from '../../../../config/constants';

// eslint-disable-next-line
const handleProcessInputEvent = (event: any) => {
  Emitter.emit(EVENTS.OPENAI_TEXT_QUERY, event);
};

export { handleProcessInputEvent };
