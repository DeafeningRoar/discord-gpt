import type { ResponseInputMessageContentList, ResponseInput, Response } from 'openai/resources/responses/responses';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';
import type { ResponsesModel } from 'openai/resources/shared';

import OpenAI from 'openai';
import logger from '../logger';
import { OPENAI_TEXT_MODEL, OPENAI_MCP_SERVERS } from '../../config/env';
import { countTokens } from '../../utils';

export interface TextQueryConfig {
  image?: string;
  chatHistory?: ChatCompletionMessageParam[];
  systemPrompt: string;
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

  async query(input: string, { image, chatHistory, systemPrompt }: TextQueryConfig) {
    logger.log('Processing message with model:', this.model);

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
      model: this.model,
      input: aiInput,
    });

    logger.log('Metadata from model response', this.logUsageMetrics(response, aiInput, systemPrompt));

    return response;
  }

  private logUsageMetrics(response: Response, input: unknown, systemPrompt: string) {
    return {
      model: response.model,
      usage: response.usage,
      internalUsageBreakdown: {
        internalCount: countTokens({ model: this.model, input: response.output }),
        systemPrompt: countTokens({ model: this.model, input: systemPrompt }),
        toolsList: countTokens({
          model: this.model,
          input: response.output.find(o => o.type === 'mcp_list_tools'),
        }),
        toolsUsage: countTokens({
          model: this.model,
          input: response.output.filter(o => o.type === 'mcp_call'),
        }),
        input: countTokens({ model: this.model, input }),
      },
      usedTools: response.output.filter(o => o.type === 'mcp_call')?.map(o => o.name),
    };
  }
}

export default OpenAIService.getInstance();
