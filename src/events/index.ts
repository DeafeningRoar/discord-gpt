import type { Discord } from '../services';

import StartDiscordListeners from './listeners/discord';
import StartOpenAIListeners from './listeners/openai';

export default ({ discord }: { discord?: Discord }) => {
  if (discord) {
    StartDiscordListeners({ discord });
  }

  StartOpenAIListeners();
};
