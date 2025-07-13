import type { Response } from 'openai/resources/responses/responses';
import type { ChatCompletionMessageParam } from 'openai/resources/index';

import { AIStrategy, AIStrategyName } from '../ai-strategy';
import { AICacheStrategy } from '../ai-cache-strategy';
import OpenAIService from '../../services/ai-services/openai';

import { appendTextFileContent } from '../helpers';

class OpenAIStrategy implements AIStrategy<Response, AICacheStrategy> {
  name = AIStrategyName.OPENAI;

  readonly cacheService = new AICacheStrategy();

  async process({ id, input, image, txt }: { id: string; name?: string; input: string; image?: string; txt?: string }) {
    const chatHistory = this.getFromCache(id);
    const userInput = input;

    const inputWithTextFile = await this.handleTextFile(userInput, txt);

    const response = await OpenAIService.query(inputWithTextFile, { image, chatHistory });

    const formattedResponse = this.formatResponse(response);

    this.saveToCache(id, inputWithTextFile, formattedResponse, { image });

    return formattedResponse;
  }

  formatResponse(response: Response): string {
    return response.output_text;
  }

  async handleTextFile(input: string, txt?: string) {
    return appendTextFileContent({ input, txtFile: txt });
  }

  getFromCache(id: string) {
    const cacheKey = this.cacheService.getCacheKey(id);
    return this.cacheService.getHistoryCache({ cacheKey });
  }

  saveToCache(id: string, input: string, response: string, files?: { image?: string }) {
    const cacheKey = this.cacheService.getCacheKey(id);

    const newContent = [
      {
        role: 'user',
        content: [
          { type: 'input_text', text: input },
          ...(files?.image ? [{ type: 'input_image', image_url: files.image }] : []),
        ],
      },
      { role: 'assistant', content: response },
    ] as ChatCompletionMessageParam[];

    return this.cacheService.setHistoryCache({ cacheKey, content: newContent });
  }

  setCacheStrategy(cacheConfig: { cacheTTL?: number; baseCacheKey?: string }) {
    if (cacheConfig.cacheTTL) this.cacheService.setCacheTTL(cacheConfig.cacheTTL);
    if (cacheConfig.baseCacheKey) this.cacheService.setBaseCacheKey(cacheConfig.baseCacheKey);
  }
}

export { OpenAIStrategy };
