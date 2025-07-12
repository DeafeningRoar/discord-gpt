import type { ChatCompletionMessageParam } from 'openai/resources/chat';
import type { ResponseInputContent } from 'openai/resources/responses/responses';
import type { BusinessLogicEvent } from '../../@types';
import type { CacheFormatter } from './helpers/openai-interaction';

import axios from 'axios';

import { Emitter, logger } from '../services';
import { OPENAI_EVENTS } from '../config/constants';
import { OpenAICommands } from './helpers/commands';
import { getHistoryCache, setHistoryCache, formatPerplexityHistory } from './helpers/openai-interaction';
import { embedCitations } from './helpers/response-formatters';

const cacheKey = 'openai-chat-history';
const getCacheKey = (id: string): string => `${id}-${cacheKey}`;

const getTextFileContent = async (txtFile: string): Promise<string> => {
  const fileContent = await axios.get(txtFile, { responseType: 'arraybuffer' });

  return fileContent.data.toString('utf-8');
};

const appendTextFileContent = async ({ txtFile, input }: { txtFile: string; input: string }): Promise<string> => {
  let fileContent: string | undefined = undefined;

  if (txtFile) {
    fileContent = await getTextFileContent(txtFile);

    return `${input}\n\nFile content:\n\n${fileContent}`;
  }

  return input;
};

const getFromCache = (id: string, formatter?: CacheFormatter) => {
  const cacheKey = getCacheKey(id);
  return getHistoryCache({ cacheKey, formatter });
};

const saveToCache = (id: string, content: ChatCompletionMessageParam[]) => {
  const cacheKey = getCacheKey(id);
  setHistoryCache({ cacheKey, content });
};

interface OpenAIProcessInputEvent extends BusinessLogicEvent {
  processMetadata: {
    openAICommand: typeof OpenAICommands.askGPTText | typeof OpenAICommands.askGPTWeb;
    responseFormatter(response: AIResponse): string;
    cache: {
      save: (input: string, response: string) => void;
      get: () => ChatCompletionMessageParam[];
    };
  };
}

interface AIResponse { response: string; citations?: string[] }

const handler = () => {
  Emitter.on(OPENAI_EVENTS.OPENAI_TEXT_QUERY, async (event: BusinessLogicEvent) => {
    const aiProcessInputEvent: OpenAIProcessInputEvent = {
      ...event,
      processMetadata: {
        openAICommand: OpenAICommands.askGPTText,
        responseFormatter: ({ response }) => response,
        cache: {
          save: (input, response) => {
            const newChatHistory = [
              {
                role: 'user',
                content: [
                  { type: 'input_text', text: input },
                  ...((event.data.files?.image
                    ? [{ type: 'input_image', image_url: event.data.files.image }]
                    : []) as ResponseInputContent[]),
                ],
              },
              { role: 'assistant', content: response },
            ] as ChatCompletionMessageParam[];

            saveToCache(event.data.id, newChatHistory);
          },
          get: () => getFromCache(event.data.id),
        },
      },
    };

    Emitter.emit(OPENAI_EVENTS.OPENAI_PROCESS_INPUT, aiProcessInputEvent);
  });

  Emitter.on(OPENAI_EVENTS.OPENAI_WEB_QUERY, async (event: BusinessLogicEvent) => {
    const aiProcessInputEvent: OpenAIProcessInputEvent = {
      ...event,
      processMetadata: {
        openAICommand: OpenAICommands.askGPTWeb,
        responseFormatter: ({ response, citations }) => embedCitations(response, citations),
        cache: {
          save: (input, response) => {
            const newChatHistory = [
              { role: 'user', content: input },
              { role: 'assistant', content: response },
            ] as ChatCompletionMessageParam[];

            saveToCache(event.data.id, newChatHistory);
          },
          get: () => getFromCache(event.data.id, formatPerplexityHistory),
        },
      },
    };

    Emitter.emit(OPENAI_EVENTS.OPENAI_PROCESS_INPUT, aiProcessInputEvent);
  });

  Emitter.on(
    OPENAI_EVENTS.OPENAI_PROCESS_INPUT,
    async ({ data, responseEvent, responseMetadata, loadingInterval, processMetadata }: OpenAIProcessInputEvent) => {
      const { openAICommand, responseFormatter, cache } = processMetadata;
      const { id, name, input: userInput, files } = data;
      let input = `Sent by ${name}: ${userInput}`;

      try {
        if (files?.txt) {
          input = await appendTextFileContent({ txtFile: files.txt, input });
        }

        const chatHistory = cache.get();

        const aiResponse = await openAICommand({
          input,
          image: files?.image,
          chatHistory,
        });

        const formattedResponse = responseFormatter(aiResponse);

        cache.save(input, formattedResponse);

        logger.log('OpenAI Response:', {
          id,
          name,
          responseLength: formattedResponse.length,
        });

        if (loadingInterval) {
          clearInterval(loadingInterval);
        }

        Emitter.emit(responseEvent, {
          response: formattedResponse,
          responseMetadata,
        });
      } catch (err) {
        if (loadingInterval) {
          clearInterval(loadingInterval);
        }

        throw err;
      }
    },
  );
};

export default handler;
