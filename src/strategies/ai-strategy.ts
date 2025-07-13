/* eslint-disable @typescript-eslint/no-explicit-any */
export interface AIStrategy<TResponse = unknown, TCacheService = unknown> {
  name: string;
  readonly cacheService: TCacheService;
  process: ({
    id,
    name,
    input,
    image,
    txt,
  }: {
    id: string;
    name: string;
    input: string;
    image?: string;
    txt?: string;
  }) => Promise<string>;
  formatResponse: (response: TResponse) => string;
  handleTextFile: (input: string, txt?: string) => Promise<string>;
  getFromCache: (...args: any[]) => any;
  saveToCache: (...args: any[]) => any;
  setCacheStrategy: (cacheStrategy: string) => void;
}

export interface AIResponse {
  response: string;
  citations?: string[];
}

export enum AIStrategyName {
  OPENAI = 'openai',
  PERPLEXITY = 'perplexity',
}
