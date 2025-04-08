import type { DiscordInteraction, PerplexityResponse } from '../../types';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';
import type { Response } from '../../services/openai';

import { OpenAI as OpenAIService, logger } from '../../services';
import { OPENAI_EVENTS } from '../../config/constants';

interface IAskGPTConfig {
  user: string;
  previousResponseId?: string;
  chatHistory?: ChatCompletionMessageParam[];
}

interface IAskGPTResponse {
  id: string;
  response: string;
  citations?: string[];
}

const COMMANDS_LIST = {
  GPT: 'gpt',
  GPT_WEB: 'gptweb',
};

async function askGPT(
  message: DiscordInteraction,
  type: 'web' | 'text',
  { user, previousResponseId, chatHistory }: IAskGPTConfig,
): Promise<IAskGPTResponse> {
  try {
    const OpenAIQueryTypes = {
      web: OpenAIService.webQuery,
      text: OpenAIService.textQuery,
    };

    const OpenAIQuery = OpenAIQueryTypes[type];

    const response = await OpenAIQuery(message.content, { img: message.img, user, previousResponseId, chatHistory });

    let openAIResponse: string;
    let citations: string[] | undefined;
    if (type === 'text') {
      openAIResponse = (response as Response).output_text;
    } else {
      const { choices, citations: ct } = response as PerplexityResponse;
      openAIResponse = choices[0].message.content as string;
      citations = ct;
    }

    return { id: response.id, response: openAIResponse, citations };
  } catch (error) {
    logger.log('Error querying OpenAI:', error);

    throw error;
  }
}

async function askGPTWeb(message: DiscordInteraction, config: Pick<IAskGPTConfig, 'user' | 'chatHistory'>) {
  return askGPT(message, 'web', config);
}

async function askGPTText(message: DiscordInteraction, config: Pick<IAskGPTConfig, 'user' | 'previousResponseId'>) {
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
