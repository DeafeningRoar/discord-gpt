/* eslint-disable no-console */
const logger = {
  log: (...args: unknown[]) => {
    console.log(new Date().toISOString(), '-', ...args);
  },
  warn: (...args: unknown[]) => {
    console.log(new Date().toISOString(), '-', ...args);
  },
  info: (...args: unknown[]) => {
    console.info(new Date().toISOString(), '-', ...args);
  },
  error: (...args: unknown[]) => {
    console.error(new Date().toISOString(), '-', ...args);
  },
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const eventLogger = (event: any) => ({
  log: (...args: unknown[]) => {
    console.log(`[${event.id}] ${new Date().toISOString()}`, '-', ...args);
  },
  warn: (...args: unknown[]) => {
    console.warn(`[${event.id}] ${new Date().toISOString()}`, '-', ...args);
  },
  info: (...args: unknown[]) => {
    console.info(`[${event.id}] ${new Date().toISOString()}`, '-', ...args);
  },
  error: (...args: unknown[]) => {
    console.error(`[${event.id}] ${new Date().toISOString()}`, '-', ...args);
  },
});

export { eventLogger };
export default logger;
