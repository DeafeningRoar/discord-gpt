import { OPENAI_EVENTS } from './constants';

enum COMMANDS_LIST {
  GPT = 'gpt',
  GPT_WEB = 'gptweb',
}

enum Roles {
  OWNER = 'owner',
  ADMIN = 'admin',
  USER = 'user',
}

const COMMAND_EVENTS = {
  [COMMANDS_LIST.GPT]: OPENAI_EVENTS.OPENAI_TEXT_QUERY,
  [COMMANDS_LIST.GPT_WEB]: OPENAI_EVENTS.OPENAI_WEB_QUERY,
};

const ROLE_AVAILABLE_COMMANDS = {
  [Roles.OWNER]: {
    [COMMANDS_LIST.GPT_WEB]: OPENAI_EVENTS.OPENAI_WEB_QUERY,
  },
  [Roles.ADMIN]: {
    [COMMANDS_LIST.GPT]: OPENAI_EVENTS.OPENAI_TEXT_QUERY,
  },
  [Roles.USER]: {
    [COMMANDS_LIST.GPT]: OPENAI_EVENTS.OPENAI_TEXT_QUERY,
  },
};

const getCommandsByRole = (): Record<Roles, Record<COMMANDS_LIST, string>> => {
  const aggregatedCommands: Record<string, Record<string, string>> = {
    [Roles.OWNER]: {
      ...ROLE_AVAILABLE_COMMANDS[Roles.USER],
      ...ROLE_AVAILABLE_COMMANDS[Roles.ADMIN],
      ...ROLE_AVAILABLE_COMMANDS[Roles.OWNER],
    },
    [Roles.ADMIN]: {
      ...ROLE_AVAILABLE_COMMANDS[Roles.USER],
      ...ROLE_AVAILABLE_COMMANDS[Roles.ADMIN],
    },
    [Roles.USER]: {
      ...ROLE_AVAILABLE_COMMANDS[Roles.USER],
    },
  };

  if (process.env.COMMAND_OVERRIDES) {
    const overrides = JSON.parse(process.env.COMMAND_OVERRIDES);
    for (const role in aggregatedCommands) {
      if (overrides[role]) {
        const overridesList = Object.keys(overrides[role]).reduce((acc, key) => {
          if (!overrides[role][key]) {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete aggregatedCommands[role as Roles][key];

            return acc;
          }

          const event = COMMAND_EVENTS[key as COMMANDS_LIST];

          acc = {
            ...acc,
            [key]: event,
          };

          return acc;
        }, {});

        aggregatedCommands[role as Roles] = {
          ...aggregatedCommands[role as Roles],
          ...overridesList,
        };
      }
    }
  }

  return aggregatedCommands;
};

export { COMMANDS_LIST, ROLE_AVAILABLE_COMMANDS, getCommandsByRole };
