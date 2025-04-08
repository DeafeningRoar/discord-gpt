import type { DiscordInteraction, PerplexityResponse } from '../../../types';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';
import type { Response } from '../../../services/openai';

import { OpenAI as OpenAIService, logger } from '../../../services';

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

export { askGPTText, askGPTWeb };
export type { IAskGPTResponse, IAskGPTConfig };
export default { askGPTText, askGPTWeb };
