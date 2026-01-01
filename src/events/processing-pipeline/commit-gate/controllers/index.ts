import type { AISchedulerResponseEvent } from '../../../../../@types';
import type { ResponseStream } from 'openai/lib/responses/ResponseStream';
import type { Conversation } from '../../../../database/schemas';

import { conversation } from '../../../../database';
import { Emitter, eventLogger } from '../../../../services';
import { PIPELINE_EVENTS } from '../../../../config/constants';

const step = 'commit-gate';

const handleAgentThinkingProcessedEvent = async (event: AISchedulerResponseEvent<ResponseStream>) => {
  const logger = eventLogger(event);
  try {
    const {
      data: { conversationId, version },
      context,
    } = event;
    const conversationModel = conversation.getModel();

    const document = await conversationModel.findOne<Conversation>({
      _id: conversationId,
      'state.active': true,
      source: context.source,
      version,
    });

    if (!document) {
      logger.info('Conversation discarded', {
        step,
        conversationId,
      });

      return;
    }

    logger.info('Using current conversation state for response candidate', {
      step,
      conversationId,
      version,
      conversationVersion: document.version,
    });

    Emitter.emit(PIPELINE_EVENTS.CANDIDATE_RESPONSE_AGENT_RESPONSE, event);
  } catch (error: unknown) {
    const err = error as Error;

    logger.error('Error handling agent output', {
      step,
      message: err.message,
      cause: err.cause,
      stack: err.stack,
    });

    throw error;
  }
};

export { handleAgentThinkingProcessedEvent };
