import type { AIProcessInputEvent } from '../../@types';

import crypto from 'crypto';
import { Router } from 'express';

import { Emitter, logger } from '../services';
import { EVENTS, EVENT_SOURCE } from '../config/constants';
import { AIStrategyName } from '../strategies/ai-strategy';
import {
  EXPRESS_CHAT_HISTORY_CACHE,
  EXPRESS_CHAT_HISTORY_CACHE_TTL,
  OPENAI_INTERNAL_SYSTEM_PROMPT,
} from '../config/env';

const router = Router();

router.post('/alexa/prompt', (req, res) => {
  const { query } = req.body;
  const { 'x-device-id': deviceId } = req.headers;

  const event: AIProcessInputEvent = {
    data: {
      id: (deviceId as string) || crypto.randomUUID().toString(),
      name: 'Amazon Alexa',
      input: query,
    },
    responseEvent: EVENTS.EXPRESS_RESPONSE_READY,
    responseMetadata: {
      res,
    },
    processMetadata: {
      strategyName: AIStrategyName.PERPLEXITY,
    },
    cacheStrategy: {
      cacheTTL: Number(EXPRESS_CHAT_HISTORY_CACHE_TTL),
      baseCacheKey: EXPRESS_CHAT_HISTORY_CACHE,
    },
    context: { source: EVENT_SOURCE.ALEXA },
  };

  Emitter.emit(EVENTS.OPENAI_WEB_QUERY, event);
});

router.post('/internal/prompt', (req, res) => {
  const { prompt } = req.body;

  logger.info('Processing internal prompt', {
    prompt: `${prompt.slice(0, 100)}...`,
  });

  const event: AIProcessInputEvent = {
    data: {
      id: crypto.randomUUID().toString(),
      name: 'Anonymous Prompt',
      input: prompt,
    },
    responseEvent: EVENTS.EXPRESS_RESPONSE_READY,
    responseMetadata: {
      res,
    },
    processMetadata: {
      strategyName: AIStrategyName.OPENAI,
      modelConfig: {
        model: 'gpt-4.1-mini',
        systemPrompt: OPENAI_INTERNAL_SYSTEM_PROMPT,
      },
    },
    cacheStrategy: {
      cacheTTL: Number(EXPRESS_CHAT_HISTORY_CACHE_TTL),
      baseCacheKey: EXPRESS_CHAT_HISTORY_CACHE,
    },
    context: { source: EVENT_SOURCE.EXPRESS },
  };

  Emitter.emit(EVENTS.OPENAI_TEXT_QUERY, event);
});

export default router;
