import type { ChatCompletion } from 'openai/resources/chat';
import type { ChatCompletionMessageParam } from 'openai/resources/index';
import type { ResponseInputText } from 'openai/resources/responses/responses';

import { EVENT_SOURCE } from '../../config/constants';
import { PERPLEXITY_DISCORD_SYSTEM_PROMPT, PERPLEXITY_ALEXA_SYSTEM_PROMPT } from '../../config/env';
import { AIStrategy, AIStrategyName } from '../ai-strategy';
import { AICacheStrategy } from '../ai-cache-strategy';
import PerplexityService from '../../services/ai-services/perplexity';

import { appendTextFileContent, embedCitations } from '../helpers';

type PerplexityResponse = ChatCompletion & {
  citations: string[];
};

type ChatHistoryItem = Pick<ChatCompletionMessageParam, 'role'> & {
  content: ResponseInputText[] | string;
  timestamp: number;
};

const formatPerplexityHistory = (history: ChatHistoryItem[]) =>
  history.map(item => ({
    role: item.role,
    content: Array.isArray(item.content) ? item.content[0].text : item.content,
  })) as ChatCompletionMessageParam[];

class PerplexityStrategy implements AIStrategy<PerplexityResponse, AICacheStrategy> {
  name = AIStrategyName.PERPLEXITY;

  readonly cacheService = new AICacheStrategy();

  private systemPrompt = 'Respond in a casual, friendly tone. Use the same language the user is using unless instructed to use a different one.';

  async process({ id, input, txt }: { id: string; name?: string; input: string; txt?: string }) {
    const chatHistory = this.getFromCache(id);
    const userInput = input;

    const inputWithTextFile = await this.handleTextFile(userInput, txt);

    const response = await PerplexityService.query(inputWithTextFile, { chatHistory, systemPrompt: this.systemPrompt });

    const formattedResponse = this.formatResponse(response as PerplexityResponse);

    this.saveToCache(id, inputWithTextFile, formattedResponse);

    return formattedResponse;
  }

  formatResponse(response: PerplexityResponse): string {
    const { choices, citations } = response;
    const openAIResponse = choices[0].message.content as string;

    return embedCitations(openAIResponse, citations);
  }

  async handleTextFile(input: string, txt?: string) {
    return appendTextFileContent({ input, txtFile: txt });
  }

  getFromCache(id: string) {
    const cacheKey = this.cacheService.getCacheKey(id);
    return this.cacheService.getHistoryCache({ cacheKey, formatter: formatPerplexityHistory });
  }

  saveToCache(id: string, input: string, response: string) {
    const cacheKey = this.cacheService.getCacheKey(id);

    const newContent = [
      { role: 'user', content: input },
      { role: 'assistant', content: response },
    ] as ChatCompletionMessageParam[];

    return this.cacheService.setHistoryCache({ cacheKey, content: newContent });
  }

  setCacheStrategy(cacheConfig: { cacheTTL?: number; baseCacheKey?: string }) {
    if (cacheConfig.cacheTTL) this.cacheService.setCacheTTL(cacheConfig.cacheTTL);
    if (cacheConfig.baseCacheKey) this.cacheService.setBaseCacheKey(cacheConfig.baseCacheKey);
  }

  setSystemPrompt(context?: { source: EVENT_SOURCE }) {
    if (context?.source === EVENT_SOURCE.DISCORD && PERPLEXITY_DISCORD_SYSTEM_PROMPT) {
      this.systemPrompt = PERPLEXITY_DISCORD_SYSTEM_PROMPT as string;
    }

    if (context?.source === EVENT_SOURCE.ALEXA && PERPLEXITY_ALEXA_SYSTEM_PROMPT) {
      this.systemPrompt = PERPLEXITY_ALEXA_SYSTEM_PROMPT as string;
    }
  }
}

export { PerplexityStrategy };
