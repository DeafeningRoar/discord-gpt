import type { ChatCompletion } from 'openai/resources/chat';
import type { ChatCompletionMessageParam } from 'openai/resources/index';
import type { ResponseInputText } from 'openai/resources/responses/responses';

import { AIStrategy, AIStrategyName } from '../ai-strategy';
import { AICacheStrategy } from '../ai-cache-strategy';
import PerplexityService from '../../services/ai-services/perplexity';

import { appendTextFileContent, getCacheKey, embedCitations } from '../helpers';

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

  readonly cacheService = AICacheStrategy;

  async process({ id, name, input, txt }: { id: string; name: string; input: string; txt?: string }) {
    const chatHistory = this.getFromCache(id);
    const userInput = `Sent by ${name}: ${input}`;

    const inputWithTextFile = await this.handleTextFile(userInput, txt);

    const response = await PerplexityService.query(inputWithTextFile, { chatHistory });

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
    const cacheKey = getCacheKey(id);
    return this.cacheService.getHistoryCache({ cacheKey, formatter: formatPerplexityHistory });
  }

  saveToCache(id: string, input: string, response: string) {
    const cacheKey = getCacheKey(id);

    const newContent = [
      { role: 'user', content: input },
      { role: 'assistant', content: response },
    ] as ChatCompletionMessageParam[];

    return this.cacheService.setHistoryCache({ cacheKey, content: newContent });
  }
}

export { PerplexityStrategy };
