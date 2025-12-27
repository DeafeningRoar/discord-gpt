import type { Discord } from '../integrations';

import DiscordListeners from './discord/listeners';
import OpenAIListeners from './openai/listeners';
import ProcessingPipelineListeners from './processing-pipeline';
import DiscordScheduler from '../integrations/discord/scheduler';

export default ({ discord }: { discord?: Discord }) => {
  OpenAIListeners();
  ProcessingPipelineListeners();

  if (discord) {
    DiscordListeners({ discord });
    DiscordScheduler.start();
  }
};
