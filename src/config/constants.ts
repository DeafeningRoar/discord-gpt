const FIVE_MINUTES_MS = 300000;

enum EVENT_SOURCE {
  DISCORD = 'discord',
  ALEXA = 'alexa',
  EXPRESS = 'express',
}

const DISCORD_ACTIONS = {
  MESSAGE_CREATE: 'messageCreate',
};

const DISCORD_EVENTS = {
  DISCORD_READY: 'DiscordReady',
  DISCORD_CONNECTION_ERROR: 'DiscordConnectionError',
  DISCORD_MESSAGE_CREATED: 'DiscordMessageCreated',
  DISCORD_INTERACTION_CREATED: 'DiscordInteractionCreated',
  DISCORD_INTERACTION_VALIDATED: 'DiscordInteractionValidated',
  DISCORD_INTERACTION_PROCESSED: 'DiscordInteractionProcessed',
};

const OPENAI_EVENTS = {
  OPENAI_PROCESS_INPUT: 'OpenAIProcessInput',
  OPENAI_TEXT_QUERY: 'OpenAITextQuery',
  OPENAI_WEB_QUERY: 'OpenAIWebQuery',
};

const EXPRESS_EVENTS = {
  EXPRESS_RESPONSE_READY: 'ExpressResponseReady',
};

const EVENTS = {
  ERROR: 'error',
  PROCESS_ERROR: 'ProcessError',
  ...DISCORD_EVENTS,
  ...OPENAI_EVENTS,
  ...EXPRESS_EVENTS,
};

export { FIVE_MINUTES_MS, DISCORD_ACTIONS, DISCORD_EVENTS, OPENAI_EVENTS, EVENTS, EVENT_SOURCE };
