import type { DiscordInteraction } from '../../types';
import type { PerplexityResponse, Response } from '../../services/openai';

import { OpenAI as OpenAIService, logger } from '../../services';
import { OPENAI_EVENTS } from '../../config/constants';

const COMMANDS_LIST = {
  GPT: 'gpt',
  GPT_WEB: 'gptweb',
};

async function askGPT(
  message: DiscordInteraction,
  type: 'web' | 'text',
  { user, previousResponseId }: { user: string; previousResponseId?: string },
): Promise<{ id: string; response: string }> {
  try {
    const OpenAIQueryTypes = {
      web: OpenAIService.webQuery,
      text: OpenAIService.textQuery,
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

    throw error;
  }
}

async function askGPTWeb(message: DiscordInteraction, config: { user: string }) {
  return askGPT(message, 'web', config);
}

async function askGPTText(message: DiscordInteraction, config: { user: string; previousResponseId?: string }) {
  return askGPT(message, 'text', config);
}

const EVENT_TYPES = {
  OWNER: {
    [COMMANDS_LIST.GPT_WEB]: OPENAI_EVENTS.OPENAI_WEB_QUERY,
  },
  ADMIN: {
    [COMMANDS_LIST.GPT]: OPENAI_EVENTS.OPENAI_TEXT_QUERY,
    [COMMANDS_LIST.GPT_WEB]: OPENAI_EVENTS.OPENAI_WEB_QUERY,
  },
  USER: {
    [COMMANDS_LIST.GPT]: OPENAI_EVENTS.OPENAI_TEXT_QUERY,
  },
};

const getAvailableEvents = ({ isAdmin, isOwner }: { isAdmin: boolean; isOwner: boolean }) => {
  if (isOwner) {
    return {
      ...EVENT_TYPES.USER,
      ...EVENT_TYPES.ADMIN,
      ...EVENT_TYPES.OWNER,
    };
  }

  if (isAdmin) {
    return {
      ...EVENT_TYPES.USER,
      ...EVENT_TYPES.ADMIN,
    };
  }

  return EVENT_TYPES.USER;
};

const getDiscordEventType = (command: string, userType: { isAdmin: boolean; isOwner: boolean }) => {
  const eventsList = getAvailableEvents(userType);
  const event = eventsList[command];

  if (!event) {
    return;
  }

  return event;
};

const OpenAI = {
  askGPTText,
  askGPTWeb,
};

export { getDiscordEventType, OpenAI };
