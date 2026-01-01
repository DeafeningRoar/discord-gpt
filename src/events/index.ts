import type { Discord } from '../integrations';

import DiscordListeners from './discord/listeners';
import OpenAIListeners from './openai/listeners';
import ProcessingPipelineListeners from './processing-pipeline';

export default ({ discord }: { discord?: Discord }) => {
  OpenAIListeners();
  ProcessingPipelineListeners();

  if (discord) {
    DiscordListeners({ discord });
  }
};
