import type { AIDecisionPipelineEvent } from '../../../../../@types';
import type { Conversation } from '../../../../database/schemas';

import { conversation } from '../../../../database';
import { Emitter, eventLogger } from '../../../../services';
import { PIPELINE_EVENTS } from '../../../../config/constants';
import { AGENT_TYPES, getAgentConfig, getConversationConfig } from '../../helpers';
import { buildContext } from '../../helpers/composeContext';
import { sleep } from '../../../../utils';

const step = 'speculative-think';

const updateLastBotMessageAt = async (conversationId: unknown) => {
  const model = conversation.getModel();
  await model.updateOne(
    { _id: conversationId },
    { $set: { 'state.lastBotMessageAt': Date.now(), 'locks.speakInFlight': true } },
  );
};

const handleProcessInputEvent = async (event: AIDecisionPipelineEvent) => {
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
    });

    if (!document) {
      logger.info('Could not find active conversation', {
        step,
        conversationId,
        source: context.source,
      });
      return;
    }

    const ts = Date.now();
    const {
      version: conversationVersion,
      state: { lastBotMessageAt, lastUserMessageAt },
      locks: { speakInFlight },
    } = document;

    if (speakInFlight && conversationVersion === version) {
      const retries = (event.responseMetadata?.thinkAttempts as number) || 1;
      if (retries % 2 !== 0) {
        logger.info('Awaiting speak in flight', {
          step,
          conversationId,
          version,
          conversationVersion,
          retries,
        });
      }

      await sleep(Math.min(2000, 600 * retries));
      return Emitter.emit(PIPELINE_EVENTS.THINK_INPUT_PROCESSED, {
        ...event,
        responseMetadata: {
          ...event.responseMetadata,
          thinkAttempts: retries + 1,
        },
      });
    }

    const {
      userSilenceTime = 2000,
      maxWaitTime = 10000,
      timeout = 15000,
    } = await getConversationConfig<{
      userSilenceTime: number;
      maxWaitTime: number;
      timeout: number;
    }>();

    const hasRecentUserMessage = ts - lastUserMessageAt.getTime() < userSilenceTime;
    const reachedMaxWaitTime = ts - lastBotMessageAt.getTime() >= maxWaitTime;
    const isReactivation
      = lastBotMessageAt.getTime() < lastUserMessageAt.getTime()
        && lastUserMessageAt.getTime() - lastBotMessageAt.getTime() > timeout;

    const agentConfig = await getAgentConfig(AGENT_TYPES.CHAT);

    const agentEventPayload = {
      ...event,
      data: {
        ...event.data,
        version: document.version,
      },
      processedInput: { input: buildContext(document, agentConfig.prompt), model: agentConfig.model },
      responseMetadata: { responseEvent: event.responseEvent, stream: true },
      responseEvent: PIPELINE_EVENTS.OUTPUT_PROCESSOR_RESPONSE_PROCESSED,
    };

    if (reachedMaxWaitTime && !isReactivation) {
      logger.info('Reached max wait time, processing think event', {
        step,
        conversationId,
        version,
        conversationVersion,
        lastUserMessageAt,
        lastBotMessageAt,
      });

      await updateLastBotMessageAt(conversationId);
      return Emitter.emit(PIPELINE_EVENTS.PROCESS_AGENT_RESPONSE, agentEventPayload);
    }

    if (conversationVersion !== version) {
      logger.info('Version mismatch, think event discarded', {
        step,
        snapshotVersion: version,
        conversationVersion,
      });

      return;
    }

    if (!hasRecentUserMessage && version === conversationVersion) {
      logger.info('Silence threshold reached, processing candidate response', {
        step,
        conversationId,
        version,
        conversationVersion,
        silenceThreshold: userSilenceTime,
        lastUserMessageAt,
      });

      await updateLastBotMessageAt(conversationId);
      return Emitter.emit(PIPELINE_EVENTS.PROCESS_AGENT_RESPONSE, agentEventPayload);
    }

    await sleep(100);
    Emitter.emit(PIPELINE_EVENTS.THINK_INPUT_PROCESSED, event);
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
