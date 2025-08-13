import type { Response } from 'openai/resources/responses/responses';
import type { ChatCompletionMessageParam } from 'openai/resources/index';
import type { InitialConfig } from '../ai-strategy';

import { EVENT_SOURCE } from '../../config/constants';
import { OPENAI_DISCORD_SYSTEM_PROMPT, OPENAI_ALEXA_SYSTEM_PROMPT } from '../../config/env';
import { AIStrategy, AIStrategyName } from '../ai-strategy';
import { AICacheStrategy } from '../ai-cache-strategy';
import OpenAIService from '../../services/ai-services/openai';
import InternalService from '../../services/internal';

import { appendTextFileContent } from '../helpers';

class OpenAIStrategy implements AIStrategy<Response, AICacheStrategy> {
  name = AIStrategyName.OPENAI;

  private systemPrompt
    = 'Respond in a casual, friendly tone. Use the same language the user is using unless instructed to use a different one.';

  readonly cacheService = new AICacheStrategy();

  private chatHistory: ChatCompletionMessageParam[] = [];

  async process({ id, input, image, txt }: { id: string; name?: string; input: string; image?: string; txt?: string }) {
    const userInput = input;

    const inputWithTextFile = await this.handleTextFile(userInput, txt);

    const response = await OpenAIService.query(inputWithTextFile, {
      image,
      chatHistory: this.chatHistory,
      systemPrompt: this.systemPrompt,
    });

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

  async initialize({ id, userId, cacheConfig, context }: InitialConfig) {
    this.setCacheStrategy(cacheConfig);
    this.setSystemPrompt(context);
    await this.setInitialContext(id, userId);
  }

  private async setInitialContext(id: string, userId: string) {
    this.chatHistory = this.getFromCache(id);

    const userFacts = await InternalService.getFacts(userId);
    const previousFacts = this.cacheService.getCache(`internal-facts:${id}`) as string | undefined;

    const newContext = this.getNewContext({ userId, facts: userFacts, previousFacts });

    if (!newContext) return;

    if (this.chatHistory[0]?.role === 'system') {
      this.chatHistory[0] = { role: 'system', content: newContext };
    } else {
      this.chatHistory.unshift({ role: 'system', content: newContext });
    }

    this.cacheService.setCache(`internal-facts:${id}`, newContext);
  }

  private getNewContext({ userId, facts, previousFacts }: { userId: string; facts?: string; previousFacts?: string }) {
    const { equal, included } = this.checkRelatedFacts(userId, facts, previousFacts);
    const isNew = !!facts && !previousFacts;
    const isEqual = equal && included;
    const isInsert = !!facts && !equal && !included;
    const isUpdate = previousFacts && !!facts && !equal && included;
    const isDelete = previousFacts && !facts && !equal && !included;

    if (isNew) {
      return `[KNOWN FACTS]\n- ${facts}`;
    }

    if (isEqual) {
      return previousFacts;
    }

    if (isInsert) {
      return `${previousFacts}\n- ${facts}.`;
    }

    if (isUpdate) {
      return this.updateFacts({ id: userId, fact: facts, previousFacts });
    }

    if (isDelete) {
      return this.updateFacts({ id: userId, previousFacts, isDelete: true });
    }
  }

  private checkRelatedFacts(id: string, facts?: string, previousFacts?: string) {
    if (!previousFacts || !facts) return { equal: false, included: false };

    const splitFacts = previousFacts.split('\n- ');

    if (splitFacts.includes(facts)) return { equal: true, included: true };
    if (previousFacts.includes(id)) return { equal: false, included: true };
    return { equal: false, included: false };
  }

  private updateFacts({
    id,
    fact,
    previousFacts,
    isDelete = false,
  }: {
    id: string;
    fact?: string;
    previousFacts: string;
    isDelete?: boolean;
  }) {
    const splitFacts = previousFacts.split('\n- ');

    if (isDelete || !fact) {
      return splitFacts.filter(f => !f.includes(id)).join('\n- ');
    }

    return splitFacts.map(f => (f.includes(id) ? fact : f)).join('\n- ');
  }

  private setCacheStrategy(cacheConfig?: { cacheTTL?: number; baseCacheKey?: string }) {
    if (cacheConfig?.cacheTTL) this.cacheService.setCacheTTL(cacheConfig.cacheTTL);
    if (cacheConfig?.baseCacheKey) this.cacheService.setBaseCacheKey(cacheConfig.baseCacheKey);
  }

  private setSystemPrompt(context?: { source: EVENT_SOURCE }) {
    if (context?.source === EVENT_SOURCE.DISCORD && OPENAI_DISCORD_SYSTEM_PROMPT) {
      this.systemPrompt = OPENAI_DISCORD_SYSTEM_PROMPT as string;
    }
    if (context?.source === EVENT_SOURCE.ALEXA && OPENAI_ALEXA_SYSTEM_PROMPT) {
      this.systemPrompt = OPENAI_ALEXA_SYSTEM_PROMPT as string;
    }
  }
}

export { OpenAIStrategy };
