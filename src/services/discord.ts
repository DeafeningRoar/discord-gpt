import { Client, GatewayIntentBits } from 'discord.js';

import emitter from './event-emitter';
import logger from './logger';
import { EVENTS } from '../config/constants';

class Discord {
  client: Client | null;

  constructor() {
    this.client = null;
  }

  subscribe(): void {
    if (!this.client) return;

    this.client.on('interactionCreate', interaction => {
      if (interaction.user.bot) return;
      emitter.emit(EVENTS.DISCORD_INTERACTION_CREATED, { interaction, client: this.client });
    });

    this.client.on('messageCreate', message => {
      if (message.author.bot) return;
      emitter.emit(EVENTS.DISCORD_MESSAGE_CREATED, { message, client: this.client });
    });

    logger.log('Initialized Discord subscriptions');
  }

  async login(): Promise<void> {
    logger.log('Logging in to Discord');
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
    });

    await this.client.login(process.env.DISCORD_TOKEN);
    logger.log('Successfully logged in to Discord');

    this.client.on('ready', () => {
      logger.log('Discord client is ready');
      emitter.emit(EVENTS.DISCORD_READY);
    });
  }

  async initialize(): Promise<boolean> {
    try {
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
