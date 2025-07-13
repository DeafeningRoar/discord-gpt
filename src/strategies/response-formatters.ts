/* eslint-disable @typescript-eslint/no-unused-vars,@typescript-eslint/no-extraneous-class */
import { EVENT_SOURCE } from '../config/constants';
import { embedCitations, removeCitations } from './helpers';

export interface ResponseFormatter {
  formatResponse(response: string, citations?: string[]): string;
}

class DiscordFormatter implements ResponseFormatter {
  formatResponse(response: string, citations?: string[]): string {
    return embedCitations(response, citations);
  }
}

class DefaultFormatter implements ResponseFormatter {
  formatResponse(response: string, citations?: string[]): string {
    return response;
  }
}

class AlexaFormatter implements ResponseFormatter {
  formatResponse(response: string, citations?: string[]): string {
    return removeCitations(response);
  }
}

class ResponseFormatterFactory {
  private static formatters = new Map<string, ResponseFormatter>([
    [EVENT_SOURCE.DISCORD, new DiscordFormatter()],
    [EVENT_SOURCE.ALEXA, new AlexaFormatter()],
    ['default', new DefaultFormatter()],
  ]);

  static getFormatter(platform?: string): ResponseFormatter {
    const formatter = this.formatters.get(platform ?? 'default');
    if (formatter) return formatter;

    const defaultFormatter = this.formatters.get('default');
    if (defaultFormatter) return defaultFormatter;

    throw new Error('No formatters available');
  }
}

export { ResponseFormatterFactory };
