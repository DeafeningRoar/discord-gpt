import type { ResponseInput, ResponseInputText } from 'openai/resources/responses/responses';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';

import { Cache } from '../../services';

type ChatHistoryItem = Pick<ChatCompletionMessageParam, 'role'> & {
  content: ResponseInputText[] | string;
  timestamp: number;
};

const cacheTTL = Number(process.env.OPENAI_CACHE_TTL || 300); // 5 minutes

const setHistoryCache = ({
  cacheKey,
  content,
}: {
  cacheKey?: string;
  content?: ChatCompletionMessageParam[] | ResponseInput;
}): boolean => {
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

  return Cache.setCache(cacheKey, JSON.stringify(history), cacheTTL);
};

export type CacheFormatter = (history: ChatHistoryItem[]) => ChatCompletionMessageParam[];

const getHistoryCache = ({
  cacheKey,
  formatter = v => v as ChatCompletionMessageParam[],
}: {
  cacheKey?: string;
  formatter?: CacheFormatter;
}): ChatCompletionMessageParam[] => {
  const cached = cacheKey ? Cache.getCache<string>(cacheKey) : undefined;

  if (!cached) return [];

  const parsedHistory = JSON.parse(cached) as ChatHistoryItem[];
  const history = parsedHistory.map(item => ({ role: item.role, content: item.content })) as ChatHistoryItem[];

  return formatter(history);
};

const formatPerplexityHistory = (history: ChatHistoryItem[]) =>
  history.map(item => ({
    role: item.role,
    content: Array.isArray(item.content) ? item.content[0].text : item.content,
  })) as ChatCompletionMessageParam[];

export { getHistoryCache, setHistoryCache, formatPerplexityHistory };
