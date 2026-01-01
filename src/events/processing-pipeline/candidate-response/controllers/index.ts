import type { AISchedulerResponseEvent } from '../../../../../@types';
import type { ResponseStream } from 'openai/lib/responses/ResponseStream';
import type { Conversation } from '../../../../database/schemas';

import { conversation } from '../../../../database';
import { Emitter, eventLogger } from '../../../../services';
import { getConversationConfig } from '../../helpers';
import { PIPELINE_EVENTS } from '../../../../config/constants';

const sleep = (time: number) => new Promise(resolve => setTimeout(resolve, time));

const step = 'candidate-response';

const releaseLocks = async (conversationId: unknown) => {
  const conversationModel = conversation.getModel();
  await conversationModel.updateOne(
    { _id: conversationId },
    { $set: { 'locks.awaitingSpeak': false } },
  );
};

const updateLastBotMessageAndReleaseLock = async (conversationId: unknown) => {
  const conversationModel = conversation.getModel();
  await conversationModel.updateOne(
    { _id: conversationId },
    { $set: { 'state.lastBotMessageAt': Date.now(), 'locks.awaitingSpeak': false } },
  );
};

const handleCandidateResponseHoldEvent = async (event: AISchedulerResponseEvent<ResponseStream>) => {
  const logger = eventLogger(event);
  try {
    await sleep(100);

    const {
      data: { conversationId, version },
      context,
    } = event;
    const conversationModel = conversation.getModel();

    const {
      userSilenceTime = 2000,
      maxWaitTime = 10000,
      timeout = 15000,
    } = await getConversationConfig<{
      userSilenceTime: number;
      maxWaitTime: number;
      timeout: number;
    }>();

    const document = await conversationModel.findOne<Conversation>({
      _id: conversationId,
      'state.active': true,
      source: context.source,
    });

    if (!document) {
      logger.info('Could not find conversation with candidate response', {
        step,
        conversationId,
      });

      await releaseLocks(conversationId);
      return;
    }

    const ts = Date.now();
    const {
      version: conversationVersion,
      state: { lastBotMessageAt, lastUserMessageAt },
    } = document;

    const hasRecentUserMessage = ts - lastUserMessageAt.getTime() < userSilenceTime;
    const reachedMaxWaitTime = ts - lastBotMessageAt.getTime() >= maxWaitTime;
    const isReactivation
      = lastBotMessageAt.getTime() < lastUserMessageAt.getTime()
        && lastUserMessageAt.getTime() - lastBotMessageAt.getTime() > timeout;

    if (reachedMaxWaitTime && !isReactivation) {
      logger.info('Reached max wait time, processing candidate response', {
        step,
        conversationId,
        version,
        conversationVersion,
        lastUserMessageAt,
        lastBotMessageAt,
      });

      await updateLastBotMessageAndReleaseLock(conversationId);
      return Emitter.emit(PIPELINE_EVENTS.OUTPUT_PROCESSOR_RESPONSE_PROCESSED, event);
    }

    if (conversationVersion !== version) {
      logger.info('Version mismatch, response discarded', {
        step,
        snapshotVersion: version,
        conversationVersion,
      });

      return await releaseLocks(conversationId);
    }

    if (!hasRecentUserMessage && version === conversationVersion) {
      logger.info('User silence reached, processing candidate response', {
        step,
        conversationId,
        version,
        conversationVersion,
        lastUserMessageAt,
        lastBotMessageAt,
      });

      await updateLastBotMessageAndReleaseLock(conversationId);
      return Emitter.emit(PIPELINE_EVENTS.OUTPUT_PROCESSOR_RESPONSE_PROCESSED, event);
    }

    Emitter.emit(PIPELINE_EVENTS.CANDIDATE_RESPONSE_AGENT_RESPONSE, event);
  } catch (error: unknown) {
    const err = error as Error;

    logger.error('Error checking candidate agent response', {
      step,
      message: err.message,
      cause: err.cause,
      stack: err.stack,
    });

    throw error;
  }
};

export { handleCandidateResponseHoldEvent };
