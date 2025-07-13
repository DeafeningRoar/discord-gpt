import type { AIProcessInputEvent } from '../../@types';

import { Router } from 'express';

import { Emitter } from '../services';
import { EVENTS } from '../config/constants';
import { AIStrategyName } from '../strategies/ai-strategy';
import { EXPRESS_CHAT_HISTORY_CACHE, EXPRESS_CHAT_HISTORY_CACHE_TTL } from '../config/env';

const router = Router();

router.post('/prompt', (req, res) => {
  const { query } = req.body;
  const { 'x-skill-id': skillId } = req.headers;

  const event: AIProcessInputEvent = {
    data: {
      id: skillId as string,
      name: 'Desconocido',
      input: query,
    },
    responseEvent: EVENTS.EXPRESS_RESPONSE_READY,
    responseMetadata: {
      res,
    },
    processMetadata: {
      strategyName: AIStrategyName.OPENAI,
    },
    cacheStrategy: {
      cacheTTL: Number(EXPRESS_CHAT_HISTORY_CACHE_TTL),
      baseCacheKey: EXPRESS_CHAT_HISTORY_CACHE,
    },
  };

  Emitter.emit(EVENTS.OPENAI_TEXT_QUERY, event);
});

export default router;
