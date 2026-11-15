require("dotenv/config");

const app = require("./app");
const prisma = require("./config/prisma");
const { initMailer } = require("./utils/mailer");
const { seedDemoUser } = require("./utils/seed");
const { recoverScheduledEmails } = require("./utils/recovery");
const { closeEmailQueue } = require("./queue/emailQueue");
const { startEmailWorker, stopEmailWorker } = require("./queue/emailWorker");

const PORT = Number(process.env.PORT) || 5001;

let httpServer = null;
let isShuttingDown = false;

async function bootstrap() {
  await prisma.$connect();
  console.log("[DB] Connected to SQLite via Prisma");

  await seedDemoUser();
  await initMailer();

  startEmailWorker();
  await recoverScheduledEmails();

  httpServer = app.listen(PORT, () => {
    console.log(`[Server] Dispatch backend running on http://localhost:${PORT}`);
  });
}

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);

  try {
    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
    }
    await stopEmailWorker();
    await closeEmailQueue();
    await prisma.$disconnect();
    console.log("[Server] Shutdown complete.");
    process.exit(0);
  } catch (err) {
    console.error("[Server] Error during shutdown:", err);
    process.exit(1);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

bootstrap().catch(async (err) => {
  console.error("[Server] Fatal startup error:", err);
  await stopEmailWorker().catch(() => {});
  await closeEmailQueue().catch(() => {});
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
