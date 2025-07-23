import type { Response, ResponseFunctionToolCall } from 'openai/resources/responses/responses';
import type { ChatCompletionMessageParam } from 'openai/resources/index';

import { EVENT_SOURCE } from '../../config/constants';
import { OPENAI_DISCORD_SYSTEM_PROMPT, OPENAI_ALEXA_SYSTEM_PROMPT } from '../../config/env';
import { AIStrategy, AIStrategyName } from '../ai-strategy';
import { AICacheStrategy } from '../ai-cache-strategy';
import OpenAIService from '../../services/ai-services/openai';

import { appendTextFileContent } from '../helpers';

class OpenAIStrategy implements AIStrategy<Response, AICacheStrategy> {
  name = AIStrategyName.OPENAI;

  private systemPrompt
    = 'Respond in a casual, friendly tone. Use the same language the user is using unless instructed to use a different one.';

  readonly cacheService = new AICacheStrategy();

  async process({ id, input, image, txt }: { id: string; name?: string; input: string; image?: string; txt?: string }) {
    const chatHistory = this.getFromCache(id);
    const userInput = input;

    const inputWithTextFile = await this.handleTextFile(userInput, txt);

    const response = await OpenAIService.query(inputWithTextFile, {
      image,
      chatHistory,
      systemPrompt: this.systemPrompt,
    });

    const functionCall = response.output.find(
      output => output.type === 'function_call' && output.status === 'completed' && output.arguments.length,
    ) as ResponseFunctionToolCall | null;

    let ttsInput: string | undefined;
    let ttsResponse: unknown;
    if (functionCall && functionCall.name === 'tts') {
      const fnCallArguments = JSON.parse(functionCall.arguments);
      ttsInput = fnCallArguments.input as string;
      ttsResponse = await this.handleTTS(fnCallArguments);
    }

    const formattedResponse = this.formatResponse(response);

    this.saveToCache(id, inputWithTextFile, ttsInput || formattedResponse, { image });

    const result = {
      type: ttsResponse ? 'audio' : 'text',
      response: (ttsResponse as { body: ReadableStream })?.body || formattedResponse,
    };

    ttsResponse = undefined;
    ttsInput = undefined;

    return result;
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

  setSystemPrompt(context?: { source: EVENT_SOURCE }) {
    if (context?.source === EVENT_SOURCE.DISCORD && OPENAI_DISCORD_SYSTEM_PROMPT) {
      this.systemPrompt = OPENAI_DISCORD_SYSTEM_PROMPT as string;
    }
    if (context?.source === EVENT_SOURCE.ALEXA && OPENAI_ALEXA_SYSTEM_PROMPT) {
      this.systemPrompt = OPENAI_ALEXA_SYSTEM_PROMPT as string;
    }
  }

  async handleTTS({ input }: { input: string }) {
    return await OpenAIService.tts(input);
  }
}

export { OpenAIStrategy };
