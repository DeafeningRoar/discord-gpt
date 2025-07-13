import type { ResponseInputMessageContentList, ResponseInput } from 'openai/resources/responses/responses';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';
import type { ResponsesModel } from 'openai/resources/shared';

import OpenAI from 'openai';
import logger from '../logger';
import { OPENAI_SYSTEM_PROMPT, OPENAI_TEXT_MODEL, OPENAI_MCP_SERVERS } from '../../config/env';

export interface TextQueryConfig {
  image?: string;
  chatHistory?: ChatCompletionMessageParam[];
}

class OpenAIService {
  private static instance: OpenAIService;
  static readonly name = 'openai';
  private readonly client = new OpenAI();
  private readonly systemPrompt = OPENAI_SYSTEM_PROMPT as string;
  private readonly model = OPENAI_TEXT_MODEL as ResponsesModel;
  private tools: OpenAI.Responses.Tool[] | undefined;

  private constructor({ tools }: { tools?: string }) {
    if (tools) {
      this.tools = JSON.parse(tools);
    }
  }

  static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService({ tools: OPENAI_MCP_SERVERS });
    }

    return OpenAIService.instance;
  }

  private getImageInput(image?: string): ResponseInputMessageContentList {
    if (!image) {
      return [];
    }

    return [{ type: 'input_image', image_url: image, detail: 'auto' }];
  }

  async query(input: string, { image, chatHistory }: TextQueryConfig) {
    logger.log('Processing message with model:', this.model);

    const userContent: ResponseInputMessageContentList = [
      { type: 'input_text', text: input },
      ...this.getImageInput(image),
    ];

    const aiInput: ResponseInput = [
      {
        role: 'system',
        content: this.systemPrompt,
      },
      ...((chatHistory || []) as ResponseInput),
      {
        role: 'user',
        content: userContent,
      },
    ];

    const response = await this.client.responses.create({
      tools: this.tools,
      model: this.model,
      input: aiInput,
    });

    logger.log('Metadata from model response', {
      model: this.model,
      usage: response.usage,
      /* eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-explicit-any */
      response: response.output.map(({ output, ...rest }: any) => ({ ...rest, output: '[redacted]' })),
    });

    return response;
  }
}

export default OpenAIService.getInstance();
