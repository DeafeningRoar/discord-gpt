import { logger } from '../../services';

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

export { embedCitations };
