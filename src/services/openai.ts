import type { ChatCompletion } from 'openai/resources/chat';
import type { ResponseInputMessageContentList, Response } from 'openai/resources/responses/responses';

import OpenAI from 'openai';
import logger from './logger';

const openai = new OpenAI();
const perplexityai = new OpenAI({
  baseURL: 'https://api.perplexity.ai',
  apiKey: process.env.PERPLEXITY_API_KEY
});

const MODELS = {
  OpenAI: {
    SEARCH_PREVIEW_MODEL: 'gpt-4o-mini-search-preview',
    TEXT_MODEL: 'gpt-4o-mini'
  },
  PerplexityAI: {
    SONAR: 'sonar'
  }
};

type PerplexityResponse = ChatCompletion & {
  citations: string[];
};

const formatPerplexityResponse = (response: PerplexityResponse) => {
  try {
    if (!response?.choices?.[0]?.message.content) return response;

    const { citations } = response;
    response.choices[0].message.content = response.choices[0].message.content?.replaceAll(
      /\[(\d+)\]/gm,
      (substring, captureGroup) => {
        const citation = citations[Number(captureGroup) - 1];
        return `[${substring}](${citation})`;
      }
    );
  } catch (error) {
    logger.error('Error formatting Perplexity response', {
      message: (error as Error).message
    });
  }

  return response;
};

const webQuery = async (message: string, { user }: { user: string | undefined }) => {
  logger.log('Processing message with', MODELS.PerplexityAI.SONAR);

  const response = (await perplexityai.chat.completions.create({
    model: MODELS.PerplexityAI.SONAR,
    messages: [
      { role: 'system', content: 'Be precise, concise and organized' },
      {
        role: 'system',
        content:
          'You are Pochita in a Discord chat. Respond in a casual, friendly tone and use Discord formatting when appropriate.'
      },
      { role: 'system', content: `Message sent by user: ${user}` },
      { role: 'user', content: message }
    ]
  })) as PerplexityResponse;

  return formatPerplexityResponse(response);
};

const textQuery = async (
  message: string,
  { img, user, previousResponseId }: { img?: string; user: string; previousResponseId?: string }
) => {
  logger.log('Processing message with', MODELS.OpenAI.TEXT_MODEL);

  const userContent: ResponseInputMessageContentList = [{ type: 'input_text', text: message }];

  if (img) {
    userContent.push({ type: 'input_image', image_url: img } as ResponseInputMessageContentList[0]);
  }

  const response = await openai.responses.create({
    model: MODELS.OpenAI.TEXT_MODEL,
    previous_response_id: previousResponseId,
    input: [
      {
        role: 'system',
        content:
          'You are Pochita in a Discord chat. Respond in a casual, friendly tone and use Discord formatting when appropriate. Multiple users could be in this conversation.'
      },
      { role: 'system', content: `Message sent by user: ${user}` },
      {
        role: 'user',
        content: userContent
      }
    ]
  });

  return response;
};

export type { PerplexityResponse, Response };
export default {
  webQuery,
  textQuery
};
