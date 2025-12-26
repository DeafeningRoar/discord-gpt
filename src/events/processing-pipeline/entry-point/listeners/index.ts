import { Emitter } from '../../../../services';
import { PIPELINE_EVENTS } from '../../../../config/constants';

import { handleProcessInputEvent } from '../controllers';

const start = () => {
  Emitter.on(
    PIPELINE_EVENTS.IGNORE_INPUT_PROCESSED,
    handleProcessInputEvent,
  );
};

export default start;
