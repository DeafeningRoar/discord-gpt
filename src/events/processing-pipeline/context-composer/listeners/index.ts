import { Emitter } from '../../../../services';
import { PIPELINE_EVENTS } from '../../../../config/constants';

import { handleProcessInputEvent, handleAgentResponseProcessed } from '../controllers';

const start = () => {
  Emitter.on(
    PIPELINE_EVENTS.CONTEXT_COMPOSER_INPUT_PROCESSED,
    handleProcessInputEvent,
  );

  Emitter.on(
    PIPELINE_EVENTS.CONTEXT_COMPOSER_AGENT_RESPONSE_PROCESSED,
    handleAgentResponseProcessed,
  );
};

export default start;
