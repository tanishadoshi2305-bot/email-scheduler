const { Worker } = require("bullmq");
const prisma = require("../config/prisma");
const { createRedisConnection } = require("../config/redis");
const { sendEmail } = require("../utils/mailer");
const { personalizeText, renderStationeryHtml } = require("../utils/templates");
const { QUEUE_NAME } = require("./emailQueue");

let emailWorker = null;
let workerConnection = null;

/**
 * Processes a single BullMQ email delivery job.
 * @param {import("bullmq").Job} job
 */
async function processEmailJob(job) {
  const { emailJobId } = job.data || {};
  if (!emailJobId) {
    console.warn(`[Worker] Job ${job.id} missing emailJobId; skipping.`);
    return { skipped: true, reason: "missing_email_job_id" };
  }

  const emailJob = await prisma.emailJob.findUnique({
    where: { id: emailJobId },
    include: {
      user: {
        select: { name: true, email: true },
      },
    },
  });

  if (!emailJob) {
    console.warn(`[Worker] EmailJob ${emailJobId} not found in database; skipping.`);
    return { skipped: true, reason: "not_found" };
  }

  if (emailJob.status === "CANCELLED") {
    console.log(`[Worker] EmailJob ${emailJobId} is CANCELLED; skipping.`);
    return { skipped: true, reason: "cancelled" };
  }

  if (emailJob.status === "SENT") {
    console.log(`[Worker] EmailJob ${emailJobId} already SENT; skipping.`);
    return { skipped: true, reason: "already_sent" };
  }

  try {
    const mergeData = {
      name: emailJob.recipientName,
      email: emailJob.recipient,
    };

    const personalizedSubject = personalizeText(emailJob.subject, mergeData);
    const personalizedBody = personalizeText(emailJob.body, mergeData);
    const html = renderStationeryHtml({
      template: emailJob.template,
      subject: emailJob.subject,
      body: emailJob.body,
      recipientName: emailJob.recipientName,
      recipientEmail: emailJob.recipient,
    });

    const { previewUrl } = await sendEmail({
      to: emailJob.recipient,
      subject: personalizedSubject,
      text: personalizedBody,
      html,
      senderName: "Dispatch Studio",
      replyTo: emailJob.user?.email,
    });

    const sentAt = new Date();
    await prisma.emailJob.update({
      where: { id: emailJob.id },
      data: {
        status: "SENT",
        sentAt,
        previewUrl,
        error: null,
      },
    });

    console.log(
      `[Worker] Sent email ${emailJob.id} -> ${emailJob.recipient}` +
        (previewUrl ? ` | Preview: ${previewUrl}` : "")
    );

    return { status: "SENT", previewUrl, sentAt };
  } catch (err) {
    const errorMessage = err?.message || "Failed to send email";

    await prisma.emailJob
      .update({
        where: { id: emailJob.id },
        data: {
          status: "FAILED",
          error: errorMessage,
        },
      })
      .catch((dbErr) => {
        console.error(`[Worker] Failed to persist error state for ${emailJob.id}:`, dbErr.message);
      });

    console.error(`[Worker] Failed email ${emailJob.id} -> ${emailJob.recipient}: ${errorMessage}`);
    throw err;
  }
}

/**
 * Starts the BullMQ email worker with configurable concurrency and rate limiting.
 */
function startEmailWorker() {
  if (emailWorker) {
    return emailWorker;
  }

  const concurrency = Number(process.env.WORKER_CONCURRENCY) || 2;
  const max = Number(process.env.RATE_LIMIT_MAX) || 5;
  const duration = Number(process.env.RATE_LIMIT_DURATION_MS) || 60000;

  workerConnection = createRedisConnection("worker");

  emailWorker = new Worker(QUEUE_NAME, processEmailJob, {
    connection: workerConnection,
    concurrency,
    limiter: {
      max,
      duration,
    },
  });

  emailWorker.on("failed", (job, err) => {
    console.error(`[Worker] BullMQ job ${job?.id || "unknown"} failed:`, err.message);
  });

  emailWorker.on("error", (err) => {
    console.error("[Worker] BullMQ worker error:", err.message);
  });

  console.log(
    `[Worker] Listening on "${QUEUE_NAME}" (concurrency=${concurrency}, rateLimit=${max}/${duration}ms)`
  );

  return emailWorker;
}

/**
 * Gracefully stops the BullMQ worker and its Redis connection.
 */
async function stopEmailWorker() {
  if (emailWorker) {
    await emailWorker.close();
    emailWorker = null;
  }
  if (workerConnection) {
    await workerConnection.quit();
    workerConnection = null;
  }
}

module.exports = {
  processEmailJob,
  startEmailWorker,
  stopEmailWorker,
};
