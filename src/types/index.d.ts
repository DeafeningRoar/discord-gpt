import type { BaseInteraction, CommandInteraction } from 'discord.js';

export type DiscordInteraction = CommandInteraction & BaseInteraction & { content: string; img?: string };
