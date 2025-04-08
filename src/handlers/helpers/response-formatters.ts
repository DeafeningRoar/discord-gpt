import { logger } from '../../services';

const embedCitations = (response: string, citations?: string[]): string => {
  try {
    if (!response || !citations?.length) return response;

    return response.replaceAll(/\[(\d+)\]/gm, (substring, captureGroup) => {
      const citation = citations[Number(captureGroup) - 1];
      return `[${substring}](${citation})`;
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

export { embedCitations };
