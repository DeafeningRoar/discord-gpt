import type { ResponseInputMessageContentList, Response, ResponseInput } from 'openai/resources/responses/responses';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';

import OpenAI from 'openai';
import logger from './logger';

export interface TextQueryConfig {
  image?: string;
  chatHistory?: ChatCompletionMessageParam[];
}

export type WebQueryConfig = Omit<TextQueryConfig, 'image'>;

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

const webQuery = async (input: string, { chatHistory }: WebQueryConfig) => {
  logger.log('Processing message with model:', PERPLEXITY_MODEL);

  const response = await perplexityai.chat.completions.create({
    model: PERPLEXITY_MODEL,
    web_search_options: {
      search_context_size: 'low',
    },
    messages: [
      {
        role: 'system',
        content: process.env.PERPLEXITY_SYSTEM_PROMPT as string,
      },
      ...(chatHistory || []),
      { role: 'user', content: input },
    ],
  });

  logger.log('Metadata from model response', {
    model: PERPLEXITY_MODEL,
    usage: response.usage,
  });

  return response;
};

const textQuery = async (input: string, { image, chatHistory }: TextQueryConfig) => {
  logger.log('Processing message with model:', OPENAI_TEXT_MODEL);

  const userContent: ResponseInputMessageContentList = [{ type: 'input_text', text: input }];

  if (image) {
    userContent.push({ type: 'input_image', image_url: image } as ResponseInputMessageContentList[0]);
  }

  let tools = undefined;

  if (MCP_SERVERS) {
    tools = JSON.parse(MCP_SERVERS);
  }

  const response = await openai.responses.create({
    tools,
    model: OPENAI_TEXT_MODEL,
    input: [
      {
        role: 'system',
        content: process.env.OPENAI_SYSTEM_PROMPT as string,
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
    /* eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-explicit-any */
    response: response.output.map(({ output, ...rest }: any) => ({ ...rest, output: '[redacted]' })),
  });

  return response;
};

export type { Response };
export default {
  webQuery,
  textQuery,
};
