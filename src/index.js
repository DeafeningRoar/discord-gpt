if (process.env.NODE_ENV !== 'production') require('dotenv').config();
const { Discord, Emitter } = require('./services');
const { FIVE_MINUTES_MS, EVENTS } = require('./config/constants');
const { sleep } = require('./utils');
const { discordHandlers } = require('./handlers');

async function start() {
  try {
    const discord = new Discord();

    discordHandlers({ discord });

    /******* Error Event Listeners *******/

    await discord.initialize();
  } catch (error) {
    console.error('Process error', error);
    [EVENTS.DISCORD_READY, EVENTS.DISCORD_MESSAGE_CREATED, EVENTS.ERROR, EVENTS.NOTIFY_ALERT].forEach(e =>
      Emitter.removeAllListeners(e)
    );
    Emitter.emit(EVENTS.PROCESS_ERROR);
  }
}

Emitter.on(EVENTS.DISCORD_CONNECTION_ERROR, async discordInstance => {
  console.log(`Reinitializing Discord in ${FIVE_MINUTES_MS / 5}ms`);
  await sleep(FIVE_MINUTES_MS / 5);
  console.log('Reinitializing Discord connection');
  await discordInstance.initialize();
});

Emitter.on(EVENTS.PROCESS_ERROR, async () => {
  console.log('Attempting to restart process in', FIVE_MINUTES_MS / 10, 'ms');
  await sleep(FIVE_MINUTES_MS / 10);
  await start();
});

Emitter.on(EVENTS.ERROR, err => {
  const errorData = {
    data: err?.response?.data || 'none',
    message: err.message,
    stack: err.stack
  };

  console.error(new Date().toISOString(), '- Caught critical error in events:', JSON.stringify(errorData, null, 2));
});

start();
