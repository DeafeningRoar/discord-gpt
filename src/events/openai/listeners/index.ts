import type { BusinessLogicEvent, AIProcessInputEvent, AISchedulerEventInput } from '../../../../@types';

import { Emitter } from '../../../services';
import { OPENAI_EVENTS, PIPELINE_EVENTS } from '../../../config/constants';

import OpenAIControllers from '../controllers';

const startListeners = () => {
  Emitter.on(
    OPENAI_EVENTS.OPENAI_TEXT_QUERY,
    async (event: BusinessLogicEvent) => await OpenAIControllers.handleOpenAITextQuery(event),
  );

  Emitter.on(
    OPENAI_EVENTS.OPENAI_WEB_QUERY,
    async (event: BusinessLogicEvent) => await OpenAIControllers.handleOpenAIWebQuery(event),
  );

  Emitter.on(
    OPENAI_EVENTS.OPENAI_PROCESS_INPUT,
    async (event: AIProcessInputEvent) => await OpenAIControllers.handleOpenAIInput(event),
  );

  Emitter.on(
    PIPELINE_EVENTS.PROCESS_AGENT_RESPONSE,
    async (event: AISchedulerEventInput) => await OpenAIControllers.handleOpenAIPipelineInput(event),
  );
};

export default startListeners;
