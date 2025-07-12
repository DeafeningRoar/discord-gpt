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

const handler = () => {
  Emitter.on(
    OPENAI_EVENTS.OPENAI_TEXT_QUERY,
    async ({ data, responseEvent, responseMetadata, loadingInterval }: BusinessLogicEvent) => {
      const { id, name, input: userInput, files } = data;
      let input = `Sent by ${name}: ${userInput}`;

      try {
        if (files?.txt) {
          input = await appendTextFileContent({ txtFile: files.txt, input });
        }

        const chatHistory = getFromCache(id);

        const { response } = await OpenAICommands.askGPTText({
          input,
          image: files?.image,
          chatHistory,
        });

        const newChatHistory = [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: input },
              ...((files?.image ? [{ type: 'input_image', image_url: files.image }] : []) as ResponseInputContent[]),
            ],
          },
          { role: 'assistant', content: response },
        ] as ChatCompletionMessageParam[];

        saveToCache(id, newChatHistory);

        logger.log('OpenAI Text Response:', {
          id,
          name,
          responseLength: response.length,
        });

        if (loadingInterval) {
          clearInterval(loadingInterval);
        }

        Emitter.emit(responseEvent, {
          response,
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

  Emitter.on(
    OPENAI_EVENTS.OPENAI_WEB_QUERY,
    async ({ data, responseEvent, responseMetadata, loadingInterval }: BusinessLogicEvent) => {
      const { id, name, input: userInput, files } = data;
      let input = `Sent by ${name}: ${userInput}`;

      try {
        if (files?.txt) {
          input = await appendTextFileContent({ txtFile: files.txt, input });
        }

        const chatHistory = getFromCache(id, formatPerplexityHistory);

        const { response, citations } = await OpenAICommands.askGPTWeb({
          input,
          chatHistory,
        });

        const newChatHistory = [
          { role: 'user', content: input },
          { role: 'assistant', content: response },
        ] as ChatCompletionMessageParam[];

        saveToCache(id, newChatHistory);

        const formattedResponse = embedCitations(response, citations);

        logger.log('OpenAI Web Response:', {
          id,
          name,
          responseLength: response.length,
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
