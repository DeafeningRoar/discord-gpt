import Dotenv from 'dotenv';
if (process.env.NODE_ENV !== 'production') {
  Dotenv.config();
}

import { Discord, Emitter, logger, ExpressService } from './services';
import { FIVE_MINUTES_MS, EVENTS } from './config/constants';
import { DISCORD_ENABLED, EXPRESS_ENABLED } from './config/env';
import { sleep } from './utils';
import setupEventListeners from './events';

async function start(): Promise<void> {
  try {
    let discord: Discord | undefined;
    let express: ExpressService | undefined;

    if (DISCORD_ENABLED === 'true') {
      logger.log('Discord integration enabled');
      discord = new Discord();
    }

    if (EXPRESS_ENABLED === 'true') {
      logger.log('Express integration enabled');
      express = new ExpressService();
    }

    setupEventListeners({ discord });

    if (discord) {
      await discord.initialize();
    }

    if (express) {
      express.init();
    }
  } catch (error) {
    logger.error('Process error', error);

    const removableEvents = Object.values(EVENTS).filter(e => e !== EVENTS.PROCESS_ERROR && e !== EVENTS.ERROR);
    removableEvents.forEach(e => Emitter.removeAllListeners(e));

    Emitter.emit(EVENTS.PROCESS_ERROR);
  }
}

Emitter.on(EVENTS.PROCESS_ERROR, async () => {
  logger.log('Attempting to restart process in', FIVE_MINUTES_MS / 10, 'ms');
  await sleep(FIVE_MINUTES_MS / 10);
  await start();
});

Emitter.on(EVENTS.ERROR, (err) => {
  const errorData = {
    data: err?.response?.data || 'none',
    message: err.message,
    stack: err.stack,
  };

  logger.error('Caught critical error in events:', JSON.stringify(errorData, null, 2));
});

start();
