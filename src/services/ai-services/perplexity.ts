import type { ChatCompletionMessageParam } from 'openai/resources/chat';

import OpenAI from 'openai';
import logger from '../logger';
import { PERPLEXITY_BASE_URL, PERPLEXITY_API_KEY, PERPLEXITY_MODEL } from '../../config/env';

export interface WebQueryConfig {
  chatHistory?: ChatCompletionMessageParam[];
  systemPrompt: string;
}

class PerplexityService {
  private static instance: PerplexityService;
  static readonly name = 'perplexity';
  private readonly client = new OpenAI({
    baseURL: PERPLEXITY_BASE_URL,
    apiKey: PERPLEXITY_API_KEY,
  });

  private readonly model = PERPLEXITY_MODEL as string;

  static getInstance() {
    if (!PerplexityService.instance) {
      PerplexityService.instance = new PerplexityService();
    }

    return PerplexityService.instance;
  }

  async query(input: string, { chatHistory, systemPrompt }: WebQueryConfig) {
    logger.log('Processing message with model:', this.model);

    const webSearchOptions: OpenAI.Chat.Completions.ChatCompletionCreateParams.WebSearchOptions = {
      search_context_size: 'low',
    };

    const aiInput: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...(chatHistory || []),
      { role: 'user', content: input },
    ];

    const response = await this.client.chat.completions.create({
      model: this.model,
      web_search_options: webSearchOptions,
      messages: aiInput,
    });

    logger.log('Metadata from model response', {
      model: this.model,
      usage: response.usage,
      systemPrompt: systemPrompt,
    });

    return response;
  }
}

export default PerplexityService.getInstance();
