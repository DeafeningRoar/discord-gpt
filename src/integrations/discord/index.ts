import { Client, GatewayIntentBits, Events as DiscordEvents, Partials } from 'discord.js';

import { Emitter as emitter, logger } from '../../services';
import { EVENTS } from '../../config/constants';
import { DISCORD_TOKEN } from '../../config/env';

class Discord {
  client: Client | null;

  constructor() {
    this.client = null;
  }

  subscribe(): void {
    if (!this.client) return;

    this.client.on(DiscordEvents.InteractionCreate, (interaction) => {
      if (interaction.user.bot) return;
      emitter.emit(EVENTS.DISCORD_INTERACTION_CREATED, { interaction, type: 'interaction', client: this.client });
    });

    this.client.on(DiscordEvents.MessageCreate, (message) => {
      if (message.author.bot) return;
      emitter.emit(EVENTS.DISCORD_INTERACTION_CREATED, { interaction: message, type: 'message', client: this.client });
    });

    logger.log('Initialized Discord subscriptions');
  }

  async login(): Promise<void> {
    logger.log('Logging in to Discord');
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
      partials: [Partials.Channel, Partials.Message],
    });

    await this.client.login(DISCORD_TOKEN);
    logger.log('Successfully logged in to Discord');

    this.client.on(DiscordEvents.ClientReady, () => {
      logger.log('Discord client is ready');
      emitter.emit(EVENTS.DISCORD_READY);
    });
  }

  async initialize(): Promise<boolean> {
    try {
      if (this.client?.isReady()) {
        return true;
      }

      await this.login();
      this.subscribe();

      return true;
    } catch (error) {
      logger.error('Error connecting to Discord', error);
      emitter.emit(EVENTS.DISCORD_CONNECTION_ERROR, this);

      return false;
    }
  }
}

export default Discord;
