import type { AIProcessInputEvent } from '../../@types';

import crypto from 'crypto';
import { Router } from 'express';

import { Emitter } from '../services';
import { EVENTS, EVENT_SOURCE } from '../config/constants';
import { AIStrategyName } from '../strategies/ai-strategy';
import {
  DISCORD_CHAT_HISTORY_CACHE,
  DISCORD_CHAT_HISTORY_CACHE_TTL,
  EXPRESS_CHAT_HISTORY_CACHE,
  EXPRESS_CHAT_HISTORY_CACHE_TTL,
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

router.post('/reminders', (req, res) => {
  const reminders = req.body;

  if (!reminders.length) {
    return res.status(201).send();
  }

  reminders.forEach(({ userId, userName, description }: { userId: string; userName: string; description: string }) => {
    const input = `
  [USER]
  ID: ${userId}
  Name: ${userName}

  [REMINDER TRIGGERED]
  ${description}`;

    const event: AIProcessInputEvent = {
      data: {
        id: userId,
        name: userName,
        input,
      },
      context: { source: EVENT_SOURCE.DISCORD },
      responseEvent: EVENTS.DISCORD_CREATE_MESSAGE,
      responseMetadata: {
        userId,
      },
      processMetadata: {
        strategyName: AIStrategyName.OPENAI,
      },
      cacheStrategy: {
        cacheTTL: Number(DISCORD_CHAT_HISTORY_CACHE_TTL),
        baseCacheKey: DISCORD_CHAT_HISTORY_CACHE,
      },
    };

    Emitter.emit(EVENTS.OPENAI_TEXT_QUERY, event);
  });

  res.status(201).send();
});

export default router;
