const express = require("express");
const prisma = require("../config/prisma");
const { emailQueue } = require("../queue/emailQueue");
const { authMiddleware } = require("../middleware/auth");
const { VALID_TEMPLATES, normalizeTemplate } = require("../utils/templates");

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_EMAIL_REGEX = /^([^<>]*?)\s*<([^<>@\s]+@[^<>\s]+\.[^<>\s]+)>$/;

router.use(authMiddleware);

/**
 * Splits a recipient string on commas, semicolons, or newlines while
 * preserving commas inside quotes or angle-bracket segments.
 */
function splitRecipientString(raw) {
  const tokens = [];
  let current = "";
  let inQuotes = false;
  let inAngles = false;

  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === "<") inAngles = true;
    else if (ch === ">") inAngles = false;

    if (!inQuotes && !inAngles && (ch === "," || ch === ";" || ch === "\n" || ch === "\r")) {
      if (current.trim()) tokens.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }

  if (current.trim()) tokens.push(current.trim());
  return tokens;
}

/**
 * Normalizes a string ("Jane <jane@x.com>" or "jane@x.com") or { email, name } object.
 */
function parseRecipientEntry(entry) {
  if (entry && typeof entry === "object") {
    const email = typeof entry.email === "string" ? entry.email.trim() : "";
    const name = typeof entry.name === "string" && entry.name.trim() ? entry.name.trim() : null;
    return { email, name, raw: email || JSON.stringify(entry) };
  }

  if (typeof entry === "string") {
    const trimmed = entry.trim();
    const angleMatch = trimmed.match(NAME_EMAIL_REGEX);
    if (angleMatch) {
      const rawName = angleMatch[1].replace(/^["']|["']$/g, "").trim();
      const email = angleMatch[2].trim();
      return { email, name: rawName || null, raw: trimmed };
    }
    return { email: trimmed, name: null, raw: trimmed };
  }

  return { email: "", name: null, raw: String(entry) };
}

function parseRecipientsPayload(recipients) {
  let rawEntries = [];
  if (typeof recipients === "string") {
    rawEntries = splitRecipientString(recipients);
  } else if (Array.isArray(recipients)) {
    rawEntries = recipients;
  } else {
    return { error: "recipients must be a non-empty array or comma/newline-separated string" };
  }

  if (rawEntries.length === 0) {
    return { error: "Please provide at least one recipient email address" };
  }

  const normalized = [];
  const invalid = [];

  for (const entry of rawEntries) {
    const parsed = parseRecipientEntry(entry);
    if (!parsed.email || !EMAIL_REGEX.test(parsed.email)) {
      invalid.push(parsed.raw);
    } else {
      normalized.push({ email: parsed.email, name: parsed.name });
    }
  }

  if (invalid.length > 0) {
    return { error: `Invalid recipient email address(es): ${invalid.join(", ")}` };
  }

  return { recipients: normalized };
}

/**
 * Safely removes any existing BullMQ job for a given EmailJob ID unless it is currently active.
 */
async function removeExistingQueueJob(emailJobId) {
  const bullJob = await emailQueue.getJob(emailJobId);
  if (!bullJob) return { activeConflict: false };

  const state = await bullJob.getState();
  if (state === "active") {
    return { activeConflict: true };
  }

  await bullJob.remove();
  return { activeConflict: false };
}

router.post("/schedule", async (req, res, next) => {
  try {
    const { recipients, subject, body, scheduledAt, staggerDelayMs, template } = req.body || {};

    const parsedRecipientsResult = parseRecipientsPayload(recipients);
    if (parsedRecipientsResult.error) {
      return res.status(400).json({ error: parsedRecipientsResult.error });
    }

    if (typeof subject !== "string" || !subject.trim()) {
      return res.status(400).json({ error: "Subject is required" });
    }

    if (typeof body !== "string" || !body.trim()) {
      return res.status(400).json({ error: "Email body is required" });
    }

    if (!scheduledAt) {
      return res.status(400).json({ error: "scheduledAt timestamp is required" });
    }

    const parsedScheduledDate = new Date(scheduledAt);
    if (Number.isNaN(parsedScheduledDate.getTime())) {
      return res.status(400).json({ error: "scheduledAt must be a valid date/time" });
    }

    if (
      template !== undefined &&
      template !== null &&
      template !== "" &&
      (typeof template !== "string" || !VALID_TEMPLATES.includes(template.trim().toLowerCase()))
    ) {
      return res.status(400).json({
        error: `template must be one of: ${VALID_TEMPLATES.join(", ")}`,
      });
    }

    const staggerNum =
      staggerDelayMs === undefined || staggerDelayMs === null || staggerDelayMs === ""
        ? 0
        : Number(staggerDelayMs);

    if (!Number.isFinite(staggerNum) || staggerNum < 0) {
      return res.status(400).json({ error: "staggerDelayMs must be a non-negative number" });
    }

    const normalizedTemplate = normalizeTemplate(template);
    const now = Date.now();
    const requestedMs = parsedScheduledDate.getTime();
    const baseDelay = Math.max(0, requestedMs - now);
    const effectiveBaseMs = Math.max(now, requestedMs);
    const trimmedSubject = subject.trim();
    const trimmedBody = body;

    const createdJobs = [];
    const recipientList = parsedRecipientsResult.recipients;

    for (let index = 0; index < recipientList.length; index += 1) {
      const { email, name } = recipientList[index];
      const delay = baseDelay + index * staggerNum;
      const effectiveScheduledAt = new Date(effectiveBaseMs + index * staggerNum);

      const emailJob = await prisma.emailJob.create({
        data: {
          userId: req.user.id,
          recipient: email,
          recipientName: name,
          subject: trimmedSubject,
          body: trimmedBody,
          template: normalizedTemplate,
          scheduledAt: effectiveScheduledAt,
          status: "SCHEDULED",
        },
      });

      try {
        await emailQueue.add(
          "send-email",
          { emailJobId: emailJob.id },
          {
            jobId: emailJob.id,
            delay,
          }
        );
      } catch (queueErr) {
        await prisma.emailJob.delete({ where: { id: emailJob.id } }).catch(() => {});
        throw queueErr;
      }

      createdJobs.push(emailJob);
    }

    return res.status(201).json({
      message: `Scheduled ${createdJobs.length} email(s)`,
      count: createdJobs.length,
      jobs: createdJobs,
    });
  } catch (err) {
    return next(err);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [scheduled, history, sentCount, failedCount, cancelledCount] = await Promise.all([
      prisma.emailJob.findMany({
        where: { userId, status: "SCHEDULED" },
        orderBy: { scheduledAt: "asc" },
      }),
      prisma.emailJob.findMany({
        where: { userId, status: { in: ["SENT", "FAILED", "CANCELLED"] } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.emailJob.count({
        where: { userId, status: "SENT" },
      }),
      prisma.emailJob.count({
        where: { userId, status: "FAILED" },
      }),
      prisma.emailJob.count({
        where: { userId, status: "CANCELLED" },
      }),
    ]);

    return res.status(200).json({
      scheduled,
      history,
      stats: {
        scheduled: scheduled.length,
        sent: sentCount,
        failed: failedCount,
        cancelled: cancelledCount,
      },
    });
  } catch (err) {
    return next(err);
  }
});

router.post("/:id/send-now", async (req, res, next) => {
  try {
    const emailJob = await prisma.emailJob.findUnique({
      where: { id: req.params.id },
    });

    if (!emailJob || emailJob.userId !== req.user.id) {
      return res.status(404).json({ error: "Email job not found" });
    }

    if (emailJob.status !== "SCHEDULED") {
      return res.status(400).json({
        error: `Cannot trigger immediate send for email with status "${emailJob.status}"`,
      });
    }

    const { activeConflict } = await removeExistingQueueJob(emailJob.id);
    if (activeConflict) {
      return res.status(409).json({
        error: "Email is currently being sent",
      });
    }

    const nowDate = new Date();
    const updatedJob = await prisma.emailJob.update({
      where: { id: emailJob.id },
      data: { scheduledAt: nowDate },
    });

    await emailQueue.add(
      "send-email",
      { emailJobId: emailJob.id },
      {
        jobId: emailJob.id,
        delay: 0,
      }
    );

    return res.status(200).json({
      message: "Email queued for immediate delivery",
      emailJob: updatedJob,
    });
  } catch (err) {
    return next(err);
  }
});

router.patch("/:id/reschedule", async (req, res, next) => {
  try {
    const { scheduledAt } = req.body || {};
    if (!scheduledAt) {
      return res.status(400).json({ error: "scheduledAt timestamp is required" });
    }

    const parsedDate = new Date(scheduledAt);
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: "scheduledAt must be a valid date/time" });
    }

    const emailJob = await prisma.emailJob.findUnique({
      where: { id: req.params.id },
    });

    if (!emailJob || emailJob.userId !== req.user.id) {
      return res.status(404).json({ error: "Email job not found" });
    }

    if (emailJob.status !== "SCHEDULED") {
      return res.status(400).json({
        error: `Cannot reschedule email with status "${emailJob.status}"`,
      });
    }

    const { activeConflict } = await removeExistingQueueJob(emailJob.id);
    if (activeConflict) {
      return res.status(409).json({
        error: "Email is currently being sent and cannot be rescheduled",
      });
    }

    const delay = Math.max(0, parsedDate.getTime() - Date.now());
    const effectiveScheduledAt = delay === 0 ? new Date() : parsedDate;

    const updatedJob = await prisma.emailJob.update({
      where: { id: emailJob.id },
      data: { scheduledAt: effectiveScheduledAt },
    });

    await emailQueue.add(
      "send-email",
      { emailJobId: emailJob.id },
      {
        jobId: emailJob.id,
        delay,
      }
    );

    return res.status(200).json({
      message: "Email rescheduled",
      emailJob: updatedJob,
    });
  } catch (err) {
    return next(err);
  }
});

router.post("/:id/retry", async (req, res, next) => {
  try {
    const emailJob = await prisma.emailJob.findUnique({
      where: { id: req.params.id },
    });

    if (!emailJob || emailJob.userId !== req.user.id) {
      return res.status(404).json({ error: "Email job not found" });
    }

    if (emailJob.status !== "FAILED" && emailJob.status !== "CANCELLED") {
      return res.status(400).json({
        error: `Only FAILED or CANCELLED emails can be retried (current status: "${emailJob.status}")`,
      });
    }

    const { activeConflict } = await removeExistingQueueJob(emailJob.id);
    if (activeConflict) {
      return res.status(409).json({
        error: "Email is currently being processed",
      });
    }

    const nowDate = new Date();
    const updatedJob = await prisma.emailJob.update({
      where: { id: emailJob.id },
      data: {
        status: "SCHEDULED",
        error: null,
        sentAt: null,
        previewUrl: null,
        scheduledAt: nowDate,
      },
    });

    await emailQueue.add(
      "send-email",
      { emailJobId: emailJob.id },
      {
        jobId: emailJob.id,
        delay: 0,
      }
    );

    return res.status(200).json({
      message: "Email queued for retry",
      emailJob: updatedJob,
    });
  } catch (err) {
    return next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const emailJob = await prisma.emailJob.findUnique({
      where: { id: req.params.id },
    });

    if (!emailJob || emailJob.userId !== req.user.id) {
      return res.status(404).json({ error: "Email job not found" });
    }

    if (emailJob.status !== "SCHEDULED") {
      return res.status(400).json({
        error: `Cannot cancel email with status "${emailJob.status}"`,
      });
    }

    const { activeConflict } = await removeExistingQueueJob(emailJob.id);
    if (activeConflict) {
      return res.status(409).json({
        error: "Email is currently being sent and cannot be cancelled",
      });
    }

    const updatedJob = await prisma.emailJob.update({
      where: { id: emailJob.id },
      data: { status: "CANCELLED" },
    });

    return res.status(200).json({
      message: "Scheduled email cancelled",
      emailJob: updatedJob,
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
