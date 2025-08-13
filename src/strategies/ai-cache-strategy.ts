import type { ResponseInput, ResponseInputText } from 'openai/resources/responses/responses';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';

import crypto from 'crypto';

import { Cache } from '../services';

type ChatHistoryItem = Pick<ChatCompletionMessageParam, 'role'> & {
  content: ResponseInputText[] | string;
  timestamp: number;
};

export type CacheFormatter = (history: ChatHistoryItem[]) => ChatCompletionMessageParam[];

class AICacheStrategy {
  static cacheService = Cache;

  cacheTTL: number;
  baseCacheKey: string;

  constructor({ cacheTTL, baseCacheKey }: { cacheTTL?: number; baseCacheKey?: string } = {}) {
    this.cacheTTL = cacheTTL || 300;
    this.baseCacheKey = baseCacheKey || crypto.randomUUID().toString();
  }

  setCacheTTL(cacheTTL: number) {
    this.cacheTTL = cacheTTL;
  }

  setBaseCacheKey(baseCacheKey: string) {
    this.baseCacheKey = baseCacheKey;
  }

  getCacheKey(id: string): string {
    return `${this.baseCacheKey}:${id}`;
  }

  getHistoryCache({
    cacheKey,
    formatter = v => v as ChatCompletionMessageParam[],
  }: {
    cacheKey?: string;
    formatter?: CacheFormatter;
  }): ChatCompletionMessageParam[] {
    const cached = cacheKey ? Cache.getCache<string>(cacheKey) : undefined;

    if (!cached) return [];

    const parsedHistory = JSON.parse(cached) as ChatHistoryItem[];
    const history = parsedHistory.map(item => ({ role: item.role, content: item.content })) as ChatHistoryItem[];

    return formatter(history);
  }

  setHistoryCache({
    cacheKey,
    content,
  }: {
    cacheKey?: string;
    content?: ChatCompletionMessageParam[] | ResponseInput;
  }): boolean {
    if (!cacheKey) return false;
    const timestamp = new Date().getTime();
    const cached = JSON.parse(Cache.getCache<string>(cacheKey) || '[]') as ChatHistoryItem[];

    const history = [...(cached || []), ...((content || []) as ChatHistoryItem[])]
      .map(item => ({
        ...item,
        timestamp: item.timestamp || timestamp,
      }))
      .sort((a, b) => {
        if (a.timestamp === b.timestamp) {
          if (a.role === 'assistant' && b.role === 'user') return 1;
          if (a.role === 'user' && b.role === 'assistant') return -1;
          return 0;
        }
        return (a.timestamp || 0) - (b.timestamp || 0);
      });

    return Cache.setCache(cacheKey, JSON.stringify(history), this.cacheTTL);
  }

  getCache(key: string) {
    return Cache.getCache(key);
  }

  setCache(key: string, value: unknown) {
    Cache.setCache(key, value, this.cacheTTL);
  }
}

export { AICacheStrategy };
