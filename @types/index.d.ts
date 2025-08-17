import type { ChatInputCommandInteraction } from 'discord.js';
import type { ChatCompletion } from 'openai/resources/chat';
import type { EVENT_SOURCE } from '../src/config/constants';

export type DiscordInteraction = ChatInputCommandInteraction & {
  content: string;
  img?: string;
  txt?: string;
  __metadata__: Record<string, unknown>;
};
export interface PerplexityResponse extends ChatCompletion {
  citations: string[];
}

export type DiscordInteractionResponseMetadata = {
  query: string;
  isEdit: boolean;
  interaction: DiscordInteraction;
  user: string;
};

export type DiscordCreateMessageMetadata = {
  targetId: string;
};

export type BusinessLogicEvent = {
  data: {
    id: string;
    userId: string;
    name: string;
    input: string;
    files?: {
      image?: string;
      txt?: string;
    };
  };
  context?: { source: EVENT_SOURCE };
  responseEvent: string;
  errorEvent?: string;
  responseMetadata: Record<string, unknown>;
  processMetadata?: DiscordProcessMetadata;
  cacheStrategy?: CacheStrategy;
};

export type CacheStrategy = {
  cacheTTL?: number;
  baseCacheKey?: string;
};

export interface AIProcessInputEvent extends BusinessLogicEvent {
  aiProcessMetadata: {
    strategyName: string;
  };
}

export type ResponseEvent<T = Record<string, unknown>, R = string> = {
  response: R;
  responseMetadata: T;
  processMetadata: DiscordProcessMetadata;
};

export type ErrorEvent<R> = {
  error?: unknown;
  processMetadata: R
};

export type DiscordProcessMetadata = {
  loadingInterval?: NodeJS.Timeout;
}

export type DiscordInteractionResponseEvent = ResponseEvent<DiscordInteractionResponseMetadata, string>;
export type DiscordCreateMessageEvent = ResponseEvent<DiscordCreateMessageMetadata, string>;
export type DiscordEnrichMessageEvent = BusinessLogicEvent & ResponseEvent<DiscordCreateMessageMetadata, string>;
export type DiscordProcessingErrorEvent = ErrorEvent<DiscordProcessMetadata>;
