import type { DiscordInteraction } from '../../types';
import type { PerplexityResponse, Response } from '../openai';

import { OpenAI } from '../';
import logger from '../logger';

const COMMANDS_LIST = {
  GPT: 'gpt',
  GPT_WEB: 'gptweb'
};

async function askGPT(
  message: DiscordInteraction,
  type: 'web' | 'text',
  { user, previousResponseId }: { user: string; previousResponseId?: string }
): Promise<{ id: string; response: string } | false> {
  try {
    const OpenAIQueryTypes = {
      web: OpenAI.webQuery,
      text: OpenAI.textQuery
    };

    const OpenAIQuery = OpenAIQueryTypes[type];

    const response = await OpenAIQuery(message.content, { img: message.img, user, previousResponseId });

    let openAIResponse: string;
    if (type === 'text') {
      openAIResponse = (response as Response).output_text;
    } else {
      openAIResponse = (response as PerplexityResponse).choices[0].message.content as string;
    }

    return { id: response.id, response: openAIResponse };
  } catch (error) {
    logger.log('Error querying OpenAI:', error);
    return false;
  }
}

async function askGPTWeb(message: DiscordInteraction, config: { user: string; previousResponseId?: string }) {
  return askGPT(message, 'web', config);
}

async function askGPTText(message: DiscordInteraction, config: { user: string; previousResponseId?: string }) {
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

const getAvailableCommands = ({ isAdmin, isOwner }: { isAdmin: boolean; isOwner: boolean }) => {
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

const getCommandHandler = (command: string, userType: { isAdmin: boolean; isOwner: boolean }) => {
  const commandsList = getAvailableCommands(userType);
  const handler = commandsList[command];

  if (!handler) {
    return;
  }

  return handler;
};

export { getCommandHandler, COMMANDS_LIST };
