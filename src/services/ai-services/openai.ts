import type { ResponseInputMessageContentList, ResponseInput } from 'openai/resources/responses/responses';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';
import type { ResponsesModel } from 'openai/resources/shared';

import OpenAI from 'openai';
import logger from '../logger';
import { OPENAI_TEXT_MODEL, OPENAI_MCP_SERVERS } from '../../config/env';

export interface TextQueryConfig {
  image?: string;
  chatHistory?: ChatCompletionMessageParam[];
  systemPrompt: string;
}

export interface ModelConfig {
  model?: string;
}

class OpenAIService {
  private static instance: OpenAIService;
  static readonly name = 'openai';
  private readonly client = new OpenAI();
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

  async query(input: string, { image, chatHistory, systemPrompt }: TextQueryConfig, config?: ModelConfig) {
    const model = config?.model || this.model;

    logger.log('Processing message with model:', model);

    const userContent: ResponseInputMessageContentList = [
      { type: 'input_text', text: input },
      ...this.getImageInput(image),
    ];

    const aiInput: ResponseInput = [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...((chatHistory || []) as ResponseInput),
      {
        role: 'user',
        content: userContent,
      },
    ];

    const response = await this.client.responses.create({
      tools: this.tools,
      model: model,
      input: aiInput,
    });

    logger.log('Metadata from model response', {
      model: model,
      usage: response.usage,
      systemPrompt: systemPrompt,
      /* eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-explicit-any */
      response: response.output.map(({ output, ...rest }: any) => ({ ...rest, output: '[redacted]' })),
    });

    return response;
  }
}

export default OpenAIService.getInstance();
