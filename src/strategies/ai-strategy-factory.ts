/* eslint-disable @typescript-eslint/no-extraneous-class, @typescript-eslint/no-explicit-any */
import { AIStrategy, AIStrategyName } from './ai-strategy';
import { OpenAIStrategy } from './openai';
import { PerplexityStrategy } from './perplexity';

class AIStrategyFactory {
  private static strategies = new Map<string, AIStrategy<any, any>>([
    [AIStrategyName.OPENAI, new OpenAIStrategy()],
    [AIStrategyName.PERPLEXITY, new PerplexityStrategy()],
  ]);

  static getStrategy(name: string): AIStrategy {
    const strategy = this.strategies.get(name);

    if (!strategy) {
      throw new Error(`Unknown AI strategy: ${name}`);
    }

    return strategy;
  }
}

export { AIStrategyFactory };
