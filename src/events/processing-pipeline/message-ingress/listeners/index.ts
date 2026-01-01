import { Emitter } from '../../../../services';
import { PIPELINE_EVENTS } from '../../../../config/constants';

import { handleProcessInputEvent } from '../controllers';

const start = () => {
  Emitter.on(
    PIPELINE_EVENTS.MESSAGE_INGRESS_INPUT_RECEIVED,
    handleProcessInputEvent,
  );
};

export default start;
