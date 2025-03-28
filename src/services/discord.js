const { Client, GatewayIntentBits } = require('discord.js');

const emitter = require('./eventEmitter');
const { formatError } = require('../utils');
const { EVENTS } = require('../config/constants');

class DiscordBot {
  constructor() {
    this.client = null;
  }

  initializeSubscriptions() {
    this.client.on('interactionCreate', interaction => {
      if (interaction.user.bot) return;
      emitter.emit(EVENTS.DISCORD_INTERACTION_CREATED, { interaction, client: this.client });
    });

    this.client.on('messageCreate', message => {
      if (message.author.bot) return;
      emitter.emit(EVENTS.DISCORD_MESSAGE_CREATED, { message, client: this.client });
    });
  }

  async initialize() {
    try {
      console.log('Logging in to Discord');
      this.client = new Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
      });
      await this.client.login(process.env.DISCORD_TOKEN);
      console.log('Successfully logged in to Discord');

      this.client.on('ready', () => {
        emitter.emit(EVENTS.DISCORD_READY);
      });

      if (this.client.isReady()) {
        emitter.emit(EVENTS.DISCORD_READY);
      }

      this.initializeSubscriptions();
      console.log('Initialized Discord subscriptions');

      return true;
    } catch (error) {
      console.log('Error connecting to Discord', error);
      emitter.emit(EVENTS.DISCORD_CONNECTION_ERROR, this);
      emitter.emit(EVENTS.NOTIFY_ALERT, formatError('Discord - initialize', formatError(error)));
      return false;
    }
  }
}

module.exports = DiscordBot;
