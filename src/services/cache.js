const NodeCache = require('node-cache');

const openAICache = new NodeCache({
  stdTTL: 300 // 5 minutes
});

module.exports = {
  getCache: key => openAICache.get(key),
  setCache: (key, value) => openAICache.set(key, value)
};
