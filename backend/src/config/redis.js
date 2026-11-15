const IORedis = require("ioredis");

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

/**
 * Creates a dedicated IORedis client configured for BullMQ compatibility.
 * @param {string} label - Descriptive label for connection logs.
 * @returns {IORedis}
 */
function createRedisConnection(label = "redis") {
  const connection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      return Math.min(times * 200, 5000);
    },
  });

  connection.on("error", (err) => {
    console.error(`[Redis:${label}] Connection error:`, err.message);
  });

  return connection;
}

module.exports = {
  REDIS_URL,
  createRedisConnection,
};
