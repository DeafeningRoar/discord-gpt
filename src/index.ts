import Dotenv from 'dotenv';
if (process.env.NODE_ENV !== 'production') {
  Dotenv.config();
}

import { Discord, Emitter, logger } from './services';
import { FIVE_MINUTES_MS, EVENTS } from './config/constants';
import { sleep } from './utils';
import eventHandlers from './handlers';

async function start(): Promise<void> {
  try {
    const discord = new Discord();

    eventHandlers({ discord });

    await discord.initialize();
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
