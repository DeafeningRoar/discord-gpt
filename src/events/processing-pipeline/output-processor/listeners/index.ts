import { Emitter } from '../../../../services';
import { PIPELINE_EVENTS } from '../../../../config/constants';

import { handleAgentResponseProcessed } from '../controllers';

const start = () => {
  Emitter.on(
    PIPELINE_EVENTS.OUTPUT_PROCESSOR_RESPONSE_PROCESSED,
    handleAgentResponseProcessed,
  );
};

export default start;
