const FIVE_MINUTES_MS = 300000;

const DISCORD_ACTIONS = {
  MESSAGE_CREATE: 'messageCreate'
};

const EVENTS = {
  ERROR: 'error',
  DISCORD_CONNECTION_ERROR: 'DiscordConnectionError',
  DISCORD_READY: 'DiscordReady',
  DISCORD_MESSAGE_CREATED: 'DiscordMessageCreated',
  PROCESS_ERROR: 'ProcessError'
};

module.exports = {
  FIVE_MINUTES_MS,
  DISCORD_ACTIONS,
  EVENTS
};
