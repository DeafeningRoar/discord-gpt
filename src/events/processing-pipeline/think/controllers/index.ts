import type { ChatCompletionMessageParam } from 'openai/resources/index';
import type { AIDecisionPipelineEvent } from '../../../../../@types';

import { AICacheStrategy } from '../../../../strategies/ai-cache-strategy';

const handleProcessInputEvent = (event: AIDecisionPipelineEvent) => {
  const { data: { id, input }, cacheStrategy } = event;
  const cacheService = new AICacheStrategy(cacheStrategy);
  const cacheKey = cacheService.getCacheKey(id);

  cacheService.setHistoryCache({
    cacheKey,
    content: [
      {
        role: 'user',
        content: [
          { type: 'input_text', text: input },
        ],
      },
    ],
  });

  console.log('Saved user input to history cache');
};

export { handleProcessInputEvent };
