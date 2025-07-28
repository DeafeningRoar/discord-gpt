import type { BusinessLogicEvent, AIProcessInputEvent } from '../../../@types';

import { Emitter } from '../../services';
import { OPENAI_EVENTS } from '../../config/constants';

import OpenAIControllers from '../controllers/openai';

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
};

export default startListeners;
