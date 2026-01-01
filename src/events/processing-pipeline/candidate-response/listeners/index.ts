import { Emitter } from '../../../../services';
import { PIPELINE_EVENTS } from '../../../../config/constants';

import { handleCandidateResponseHoldEvent } from '../controllers';

const start = () => {
  Emitter.on(
    PIPELINE_EVENTS.CANDIDATE_RESPONSE_AGENT_RESPONSE,
    handleCandidateResponseHoldEvent,
  );
};

export default start;
