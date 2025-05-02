import type { Key } from 'node-cache';

import NodeCache from 'node-cache';

const cache = new NodeCache({
  stdTTL: 300, // 5 minutes
});

export default {
  getCache: <T>(key: Key) => cache.get<T>(key),
  setCache: (key: Key, value: unknown, ttl?: number | string) =>
    typeof ttl !== 'undefined' ? cache.set(key, value, ttl) : cache.set(key, value),
};
