import type { ResponseInput, Response, ResponseFormatTextConfig } from 'openai/resources/responses/responses';

import OpenAI from 'openai';
import logger from '../logger';
import { countTokens } from '../../utils';

export interface TextQueryConfig {
  format?: ResponseFormatTextConfig;
  logMetrics?: boolean;
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

  async query(input: { role: string; content: string }[], { format, logMetrics }: TextQueryConfig = {}) {
    logger.log('Processing message with model:', this.model);

    const aiInput = input as ResponseInput;

    const response = await this.client.responses.create({
      tools: this.tools,
      model: this.model,
      input: aiInput,
      text: format ? { format } : undefined,
    });

    if (logMetrics) logger.log('Metadata from model response', this.logUsageMetrics(response, aiInput));

    return response;
  }

  private logUsageMetrics(response: Response, input: ResponseInput) {
    return {
      model: response.model,
      usage: response.usage,
      internalUsageBreakdown: {
        internalCount: countTokens({ model: this.model, input: response.output }),
        systemPrompt: countTokens({ model: this.model, input: [input[0]] }),
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
