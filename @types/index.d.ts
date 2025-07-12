import type { BaseInteraction, CommandInteraction } from 'discord.js';
import type { ChatCompletion } from 'openai/resources/chat';

export type DiscordInteraction = CommandInteraction & BaseInteraction & { content: string; img?: string; txt?: string };
export interface PerplexityResponse extends ChatCompletion {
  citations: string[];
}

export type DiscordResponseMetadata = {
  query: string;
  isEdit: boolean;
  interaction: DiscordInteraction;
  user: string;
};

export type BusinessLogicEvent = {
  data: {
    id: string;
    name: string;
    input: string;
    files?: {
      image?: string;
      txt?: string;
    };
  };
  responseEvent: string;
  responseMetadata: Record<string, unknown>;
  loadingInterval?: NodeJS.Timeout;
};

export type ResponseEvent<T = Record<string, unknown>, R = string> = {
  response: R;
  responseMetadata: T;
};
