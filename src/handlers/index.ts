import type { Discord } from '../services';

import discord from './discord';
import openai from './openai';

export default ({ discord: discordInstance }: { discord: Discord }) => {
  discord({ discord: discordInstance });
  openai();
};
