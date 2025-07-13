/* eslint-disable @typescript-eslint/no-extraneous-class, @typescript-eslint/no-explicit-any */
import { AIStrategy, AIStrategyName } from './ai-strategy';
import { OpenAIStrategy } from './openai';
import { PerplexityStrategy } from './perplexity';

class AIStrategyFactory {
  static getStrategy(name: string): AIStrategy<any, any> {
    switch (name) {
      case AIStrategyName.OPENAI:
        return new OpenAIStrategy();
      case AIStrategyName.PERPLEXITY:
        return new PerplexityStrategy();
      default:
        throw new Error(`Unknown AI strategy: ${name}`);
    }
  }
}

export { AIStrategyFactory };
