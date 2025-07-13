/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CacheStrategy } from '../../@types';
import type { EVENT_SOURCE } from '../config/constants';

export interface AIStrategy<TResponse = unknown, TCacheService = unknown> {
  name: string;
  readonly cacheService?: TCacheService;
  process: ({
    id,
    name,
    input,
    image,
    txt,
  }: {
    id: string;
    name: string;
    input: string;
    image?: string;
    txt?: string;
  }) => Promise<string>;
  formatResponse: (response: TResponse) => string;
  handleTextFile: (input: string, txt?: string) => Promise<string>;
  getFromCache: (...args: any[]) => any;
  saveToCache: (...args: any[]) => any;
  setCacheStrategy: (cacheConfig: CacheStrategy) => void;
  setSystemPrompt: (context?: { source: EVENT_SOURCE }) => void;
}

export interface AIResponse {
  response: string;
  citations?: string[];
}

export enum AIStrategyName {
  OPENAI = 'openai',
  PERPLEXITY = 'perplexity',
}
