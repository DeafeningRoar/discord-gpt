import { Emitter } from '../../../../services';
import { PIPELINE_EVENTS } from '../../../../config/constants';

import { handleProcessInputEvent } from '../controllers';

const start = () => {
  Emitter.on(
    PIPELINE_EVENTS.PIPELINE_ENTRY_POINT,
    handleProcessInputEvent,
  );
};

export default start;
