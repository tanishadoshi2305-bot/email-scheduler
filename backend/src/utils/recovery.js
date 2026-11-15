const prisma = require("../config/prisma");
const { emailQueue } = require("../queue/emailQueue");

/**
 * Recovers pending SCHEDULED EmailJobs on server boot by ensuring each has
 * a corresponding job in BullMQ with the remaining delay until scheduledAt.
 */
async function recoverScheduledEmails() {
  const pendingEmails = await prisma.emailJob.findMany({
    where: { status: "SCHEDULED" },
    orderBy: { scheduledAt: "asc" },
  });

  let recoveredCount = 0;

  for (const emailJob of pendingEmails) {
    const existingJob = await emailQueue.getJob(emailJob.id);

    if (!existingJob) {
      const delay = Math.max(0, new Date(emailJob.scheduledAt).getTime() - Date.now());
      await emailQueue.add(
        "send-email",
        { emailJobId: emailJob.id },
        {
          jobId: emailJob.id,
          delay,
        }
      );
      recoveredCount += 1;
      console.log(
        `[Recovery] Re-enqueued EmailJob ${emailJob.id} (${emailJob.recipient}) with delay ${delay}ms`
      );
    }
  }

  console.log(
    `[Recovery] Checked ${pendingEmails.length} scheduled email(s); recovered ${recoveredCount} missing job(s).`
  );

  return {
    totalScheduled: pendingEmails.length,
    recoveredCount,
  };
}

module.exports = {
  recoverScheduledEmails,
};
