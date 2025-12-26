import type { ResponseInputMessageContentList, ResponseInput, Response, ResponseFormatTextConfig } from 'openai/resources/responses/responses';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';

import OpenAI from 'openai';
import logger from '../logger';
import { countTokens } from '../../utils';

export interface TextQueryConfig {
  image?: string;
  chatHistory?: ChatCompletionMessageParam[];
  systemPrompt: string;
  format: ResponseFormatTextConfig;
}

class OpenAIService {
  private readonly client = new OpenAI();
  private model: string;
  private tools: OpenAI.Responses.Tool[] | undefined;

  constructor({ model, tools }: { tools?: string; model: string }) {
    if (tools) {
      this.tools = JSON.parse(tools);
    }

    this.model = model;
  }

  async query(input: string, { chatHistory, systemPrompt, format }: TextQueryConfig) {
    logger.log('Processing message with model:', this.model);

    const userContent: ResponseInputMessageContentList = [
      { type: 'input_text', text: input },
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
      text: { format },
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

export default OpenAIService;
