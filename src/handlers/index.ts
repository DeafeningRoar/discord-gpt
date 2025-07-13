import type { Discord } from '../services';

import discord from './discord';
import openai from './openai';

export default ({ discord: discordInstance }: { discord?: Discord }) => {
  if (discordInstance) {
    discord({ discord: discordInstance });
  }

  openai();
};
