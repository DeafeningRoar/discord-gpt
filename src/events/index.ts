import type { Discord } from '../integrations';

import StartDiscordListeners from './listeners/discord';
import StartOpenAIListeners from './listeners/openai';

export default ({ discord }: { discord?: Discord }) => {
  if (discord) {
    StartDiscordListeners({ discord });
  }

  StartOpenAIListeners();
};
