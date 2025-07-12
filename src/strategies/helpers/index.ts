import axios from 'axios';

import { logger } from '../../services';

const getTextFileContent = async (txtFile: string): Promise<string> => {
  const fileContent = await axios.get(txtFile, { responseType: 'arraybuffer' });

  return fileContent.data.toString('utf-8');
};

const appendTextFileContent = async ({ txtFile, input }: { txtFile?: string; input: string }): Promise<string> => {
  let fileContent: string | undefined = undefined;

  if (txtFile) {
    fileContent = await getTextFileContent(txtFile);

    return `${input}\n\nFile content:\n\n${fileContent}`;
  }

  return input;
};

const getCacheKey = (id: string): string => `${id}-${process.env.AI_CACHE_KEY}`;

const embedCitations = (response: string, citations?: string[]): string => {
  try {
    if (!response || !citations?.length) return response;

    return response.replaceAll(/\[{1,2}(\d+)\]{1,2}(?:\(([^)]+)\))?/gm, (_, captureGroup) => {
      const citation = citations[Number(captureGroup) - 1];
      return `[[${captureGroup}]](${citation})`;
    });
  } catch (error) {
    logger.error('Error formatting AI Response', {
      response,
      citations,
      message: (error as Error).message,
    });
  }

  return response;
};

export { appendTextFileContent, getTextFileContent, getCacheKey, embedCitations };
