import type { ChatInputCommandInteraction, OmitPartialGroupDMChannel, Message } from 'discord.js';
import type { ChatCompletion } from 'openai/resources/chat';
import type { EVENT_SOURCE } from '../src/config/constants';

export type DiscordInteraction = ChatInputCommandInteraction & {
  content: string;
  img?: string;
  txt?: string;
  eventType: 'interaction';
  __metadata__: Record<string, unknown>;
};

export type DiscordMessage = OmitPartialGroupDMChannel<Message<boolean>> & {
  user: Message['author'];
  img?: string;
  txt?: string;
  eventType: 'message';
  __metadata__: Record<string, unknown>;
};

export interface PerplexityResponse extends ChatCompletion {
  citations: string[];
}

export type DiscordInteractionResponseMetadata = {
  query: string;
  isEdit: boolean;
  interaction: DiscordInteraction | DiscordMessage;
  user: string;
};

export type DiscordCreateMessageMetadata = {
  targetId: string;
  attachments?: {
    image?: string;
  };
};

export type BusinessLogicEvent = {
  id: string;
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

export interface AIPipelineEvent extends BusinessLogicEvent {
  aiProcessMetadata: {
    strategyName: string;
  };
  eventType: string;
}

export interface AIDecisionPipelineEvent extends AIPipelineEvent {
  processedInput?: {
    input: Array<{ role: string; content: string }>;
  };
}

export interface AISchedulerEvent {
  id: string;
  data: { conversationId: string };
  context: { source: string };
  responseEvent: string;
}

export interface AIResponseInProgressEvent {
  data: {
    channelId: string;
  };
}

export interface AISchedulerEventInput extends AISchedulerEvent {
  processedInput: { input: Array<{ role: string; content: string }> };
  responseMetadata: Record<string, unknown>;
}

export interface AISchedulerResponseEvent {
  id: string;
  data: { conversationId: string };
  context: { source: string };
  responseEvent: string;
  response: string;
  responseMetadata: {
    responseEvent: string;
    initiateTime: number;
  };
}

export interface AIDecisionPipelineResponseEvent extends AIDecisionPipelineEvent {
  response: string;
}

export type ResponseEvent<T = Record<string, unknown>, R = string> = {
  response: R;
  responseMetadata: T;
  processMetadata: DiscordProcessMetadata;
};

export type ErrorEvent<R> = {
  error?: unknown;
  processMetadata: R;
};

export type DiscordProcessMetadata = {
  loadingInterval?: NodeJS.Timeout;
};

export type DiscordInteractionResponseEvent = ResponseEvent<DiscordInteractionResponseMetadata, string>;
export type DiscordCreateMessageEvent = ResponseEvent<DiscordCreateMessageMetadata, string>;
export type DiscordEnrichMessageEvent = BusinessLogicEvent & ResponseEvent<DiscordCreateMessageMetadata, string>;
export type DiscordProcessingErrorEvent = ErrorEvent<DiscordProcessMetadata>;
