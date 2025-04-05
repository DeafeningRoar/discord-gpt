import type { Key } from 'node-cache';

import NodeCache from 'node-cache';

const openAICache = new NodeCache({
  stdTTL: 300 // 5 minutes
});

export default {
  getCache: <T>(key: Key) => openAICache.get<T>(key),
  setCache: (key: Key, value: unknown, ttl?: number | string) =>
    typeof ttl !== 'undefined' ? openAICache.set(key, value, ttl) : openAICache.set(key, value)
};
