const { OpenAI } = require('../');

const COMMANDS_LIST = {
  GPT: 'gpt',
  GPT_WEB: 'gptweb'
};

/**
 *
 * @param {object} message
 * @param {'web'|'text'} type
 * @returns
 */
async function askGPT(message, type, { user, previousResponseId }) {
  try {
    const OpenAIQueryTypes = {
      web: OpenAI.webQuery,
      text: OpenAI.textQuery
    };

    const OpenAIQuery = OpenAIQueryTypes[type];

    const response = await OpenAIQuery(message.content, message.img, { user, previousResponseId });
    const { id, choices, output_text } = response;

    const openAIResponse = choices ? choices[0].message.content : output_text;

    return { id, response: openAIResponse };
  } catch (error) {
    console.log('Error querying OpenAI:', error);
    return false;
  }
}

async function askGPTWeb(message, config) {
  return askGPT(message, 'web', config);
}

async function askGPTText(message, config) {
  return askGPT(message, 'text', config);
}

const COMMAND_HANDLERS = {
  OWNER: {
    [COMMANDS_LIST.GPT_WEB]: askGPTWeb
  },
  ADMIN: {
    [COMMANDS_LIST.GPT]: askGPTText,
    [COMMANDS_LIST.GPT_WEB]: askGPTWeb
  },
  USER: {
    [COMMANDS_LIST.GPT]: askGPTText
  }
};

const getAvailableCommands = ({ isAdmin, isOwner }) => {
  if (isOwner) {
    return {
      ...COMMAND_HANDLERS.USER,
      ...COMMAND_HANDLERS.ADMIN,
      ...COMMAND_HANDLERS.OWNER
    };
  }

  if (isAdmin) {
    return {
      ...COMMAND_HANDLERS.USER,
      ...COMMAND_HANDLERS.ADMIN
    };
  }

  return COMMAND_HANDLERS.USER;
};

const getCommandHandler = (command, userType) => {
  const commandsList = getAvailableCommands(userType);
  const handler = commandsList[command];

  if (!handler) {
    return;
  }

  return handler;
};

module.exports = {
  getCommandHandler,
  COMMANDS_LIST
};
