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

const { OPENAI_TEXT_MODEL, PERPLEXITY_MODEL, MCP_SERVERS } = process.env as {
  OPENAI_TEXT_MODEL: string;
  PERPLEXITY_MODEL: string;
  MCP_SERVERS: string;
};

const webQuery = async (message: string, { chatHistory }: WebQueryConfig) => {
  logger.log('Processing message with model:', PERPLEXITY_MODEL);

  const response = await perplexityai.chat.completions.create({
    model: PERPLEXITY_MODEL,
    web_search_options: {
      search_context_size: 'low',
    },
    messages: [
      {
        role: 'system',
        content:
          'Be precise, concise and organized. You are Pochita in a Discord chat. Respond in a casual, friendly tone and use Discord formatting when appropriate. Multiple users could be in this conversation.',
      },
      ...(chatHistory || []),
      { role: 'user', content: message },
    ],
  });

  logger.log('Metadata from model response', {
    model: PERPLEXITY_MODEL,
    usage: response.usage,
  });

  return response;
};

const textQuery = async (message: string, { img, chatHistory }: TextQueryConfig) => {
  logger.log('Processing message with model:', OPENAI_TEXT_MODEL);

  const userContent: ResponseInputMessageContentList = [{ type: 'input_text', text: message }];

  if (img) {
    userContent.push({ type: 'input_image', image_url: img } as ResponseInputMessageContentList[0]);
  }

  let tools = undefined;

  if (MCP_SERVERS) {
    tools = JSON.parse(MCP_SERVERS);
  }

  const response = await openai.responses.create({
    tools,
    model: OPENAI_TEXT_MODEL,
    // previous_response_id: previousResponseId,
    input: [
      {
        role: 'system',
        content:
          'You are Pochita in a Discord chat. Respond in a casual, friendly tone and use Discord formatting when appropriate. Multiple users could be in this conversation.',
      },
      ...((chatHistory || []) as unknown as ResponseInput),
      {
        role: 'user',
        content: userContent,
      },
    ],
  });

  logger.log('Metadata from model response', {
    model: OPENAI_TEXT_MODEL,
    usage: response.usage,
    response: response.output,
  });

  return response;
};

export type { Response };
export default {
  webQuery,
  textQuery,
};
