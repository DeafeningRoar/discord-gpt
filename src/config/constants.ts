const FIVE_MINUTES_MS = 300000;

const DISCORD_ACTIONS = {
  MESSAGE_CREATE: 'messageCreate',
};

const EVENTS = {
  ERROR: 'error',
  DISCORD_CONNECTION_ERROR: 'DiscordConnectionError',
  DISCORD_READY: 'DiscordReady',
  DISCORD_MESSAGE_CREATED: 'DiscordMessageCreated',
  DISCORD_INTERACTION_CREATED: 'DiscordInteractionCreated',
  PROCESS_ERROR: 'ProcessError',
};

const OPENAI_EVENTS = {
  OPENAI_TEXT_QUERY: 'OpenAITextQuery',
  OPENAI_WEB_QUERY: 'OpenAIWebQuery',
};

export { FIVE_MINUTES_MS, DISCORD_ACTIONS, EVENTS, OPENAI_EVENTS };
