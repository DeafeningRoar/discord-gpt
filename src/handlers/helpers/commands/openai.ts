import type { PerplexityResponse } from '../../../../@types';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';
import type { Response } from '../../../services/openai';

import { OpenAI as OpenAIService, logger } from '../../../services';

interface IAskGPTResponse {
  id: string;
  response: string;
  citations?: string[];
}

interface AskGPTParams {
  input: string;
  image?: string;
  type: 'web' | 'text';
  chatHistory?: ChatCompletionMessageParam[];
}

async function askGPT({ input, image, type, chatHistory }: AskGPTParams): Promise<IAskGPTResponse> {
  try {
    const OpenAIQueryTypes = {
      web: OpenAIService.webQuery,
      text: OpenAIService.textQuery,
    };

    const OpenAIQuery = OpenAIQueryTypes[type];

    const response = await OpenAIQuery(input, { image, chatHistory });

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

async function askGPTWeb({ input, chatHistory }: Omit<AskGPTParams, 'image' | 'type'>) {
  return askGPT({ input, type: 'web', chatHistory });
}

async function askGPTText({ input, image, chatHistory }: Omit<AskGPTParams, 'type'>) {
  return askGPT({ input, image, type: 'text', chatHistory });
}

export { askGPTText, askGPTWeb };
export type { IAskGPTResponse };
export default { askGPTText, askGPTWeb };
