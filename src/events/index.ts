import type { Discord } from '../integrations';

import StartDiscordListeners from './discord/listeners';
import StartOpenAIListeners from './openai/listeners';

export default ({ discord }: { discord?: Discord }) => {
  if (discord) {
    StartDiscordListeners({ discord });
  }

  StartOpenAIListeners();
};
