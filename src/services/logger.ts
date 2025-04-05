const logger = {
  log: (...args: unknown[]) => {
    console.log(new Date().toISOString(), '-', ...args);
  },
  info: (...args: unknown[]) => {
    console.info(new Date().toISOString(), '-', ...args);
  },
  error: (...args: unknown[]) => {
    console.error(new Date().toISOString(), '-', ...args);
  }
};

export default logger;
