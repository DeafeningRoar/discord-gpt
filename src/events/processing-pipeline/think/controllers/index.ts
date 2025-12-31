import type { AIDecisionPipelineEvent } from '../../../../../@types';
import type { Conversation } from '../../../../database/schemas';

import { conversation } from '../../../../database';
import { Emitter, eventLogger } from '../../../../services';
import { PIPELINE_EVENTS } from '../../../../config/constants';
import { AGENT_TYPES, getAgentConfig } from '../../helpers';
import { buildContext } from '../../helpers/composeContext';

const step = 'speculative-think';

const handleProcessInputEvent = async (event: AIDecisionPipelineEvent) => {
  const logger = eventLogger(event);
  try {
    const {
      data: { conversationId },
      context,
    } = event;

    const conversationModel = conversation.getModel();

    const document = await conversationModel.findOne<Conversation>({
      _id: conversationId,
      'state.active': true,
      source: context.source,
    });

    if (!document) {
      logger.info('Could not find active conversation', {
        step,
        conversationId,
        source: context.source,
      });
      return;
    }

    const agentConfig = await getAgentConfig(AGENT_TYPES.CHAT);

    logger.info('Sending conversation state for agent processing', {
      step,
      conversationId,
      version: document.version,
    });

    Emitter.emit(PIPELINE_EVENTS.PROCESS_AGENT_RESPONSE, {
      ...event,
      data: {
        ...event.data,
        version: document.version,
      },
      processedInput: { input: buildContext(document, agentConfig.prompt), model: agentConfig.model },
      responseMetadata: { responseEvent: event.responseEvent, stream: true },
      responseEvent: PIPELINE_EVENTS.COMMIT_GATE_AGENT_THINKING_PROCESSED,
    });
  } catch (error: unknown) {
    const err = error as Error;

    logger.error('Error processing think event', {
      message: err.message,
      cause: err.cause,
      stack: err.stack,
    });
  }
};

export { handleProcessInputEvent };
