const { Queue } = require("bullmq");
const { createRedisConnection } = require("../config/redis");

const QUEUE_NAME = "email-queue";

const queueConnection = createRedisConnection("queue");

const emailQueue = new Queue(QUEUE_NAME, {
  connection: queueConnection,
  defaultJobOptions: {
    removeOnComplete: false,
    removeOnFail: false,
  },
});

emailQueue.on("error", (err) => {
  console.error("[Queue] BullMQ queue error:", err.message);
});

async function closeEmailQueue() {
  await emailQueue.close();
  await queueConnection.quit();
}

module.exports = {
  QUEUE_NAME,
  emailQueue,
  queueConnection,
  closeEmailQueue,
};
