import type { ResponseInputMessageContentList, Response, ResponseInput } from 'openai/resources/responses/responses';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';

import OpenAI from 'openai';
import logger from './logger';

interface TextQueryConfig {
  user: string;
  img?: string;
  previousResponseId?: string;
  chatHistory?: ChatCompletionMessageParam[];
}

type WebQueryConfig = Pick<TextQueryConfig, 'user' | 'chatHistory'>;

const openai = new OpenAI();
const perplexityai = new OpenAI({
  baseURL: 'https://api.perplexity.ai',
  apiKey: process.env.PERPLEXITY_API_KEY,
});

const MODELS = {
  OpenAI: {
    SEARCH_PREVIEW_MODEL: 'gpt-4o-mini-search-preview',
    TEXT_MODEL: 'gpt-4o-mini',
  },
  PerplexityAI: {
    SONAR: 'sonar',
  },
};

const webQuery = async (message: string, { user, chatHistory }: WebQueryConfig) => {
  logger.log('Processing message with model:', MODELS.PerplexityAI.SONAR);

  const response = await perplexityai.chat.completions.create({
    model: MODELS.PerplexityAI.SONAR,
    web_search_options: {
      search_context_size: 'low',
    },
    messages: [
      {
        role: 'system',
        content: `Be precise, concise and organized. You are Pochita in a Discord chat. Respond in a casual, friendly tone and use Discord formatting when appropriate. Multiple users could be in this conversation. Message sent by user: ${user}`,
      },
      ...(chatHistory || []),
      { role: 'user', content: message },
    ],
  });

  logger.log('Metadata from model response', {
    model: MODELS.PerplexityAI.SONAR,
    usage: response.usage,
  });

  return response;
};

const textQuery = async (message: string, { img, user, chatHistory }: TextQueryConfig) => {
  logger.log('Processing message with model:', MODELS.OpenAI.TEXT_MODEL);

  const userContent: ResponseInputMessageContentList = [{ type: 'input_text', text: message }];

  if (img) {
    userContent.push({ type: 'input_image', image_url: img } as ResponseInputMessageContentList[0]);
  }

  const response = await openai.responses.create({
    model: MODELS.OpenAI.TEXT_MODEL,
    // previous_response_id: previousResponseId,
    input: [
      {
        role: 'system',
        content: `You are Pochita in a Discord chat. Respond in a casual, friendly tone and use Discord formatting when appropriate. Multiple users could be in this conversation. Message sent by user: ${user}`,
      },
      ...((chatHistory || []) as unknown as ResponseInput),
      {
        role: 'user',
        content: userContent,
      },
    ],
  });

  logger.log('Metadata from model response', {
    model: MODELS.OpenAI.TEXT_MODEL,
    usage: response.usage,
  });

  return response;
};

export type { Response };
export default {
  webQuery,
  textQuery,
};
