import { Emitter } from '../../../../services';
import { PIPELINE_EVENTS } from '../../../../config/constants';

import { handleAgentThinkingProcessedEvent } from '../controllers';

const start = () => {
  Emitter.on(
    PIPELINE_EVENTS.COMMIT_GATE_AGENT_THINKING_PROCESSED,
    handleAgentThinkingProcessedEvent,
  );
};

export default start;
