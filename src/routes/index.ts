import type { AIProcessInputEvent } from '../../@types';

import { Router } from 'express';

import { Emitter } from '../services';
import { EVENTS } from '../config/constants';
import { AIStrategyName } from '../strategies/ai-strategy';

const router = Router();

router.post('/ask', (req, res) => {
  const { query } = req.body;

  const event: AIProcessInputEvent = {
    data: {
      id: '1',
      name: 'test',
      input: query,
    },
    responseEvent: 'TEST_EVENT',
    responseMetadata: {
      res,
    },
    processMetadata: {
      strategyName: AIStrategyName.OPENAI,
    },
  };

  Emitter.emit(EVENTS.OPENAI_TEXT_QUERY, event);
});

export default router;
