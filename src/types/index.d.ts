import type { BaseInteraction, CommandInteraction } from 'discord.js';
import type { ChatCompletion } from 'openai/resources/chat';

export type DiscordInteraction = CommandInteraction & BaseInteraction & { content: string; img?: string };
export interface PerplexityResponse extends ChatCompletion {
  citations: string[];
}
