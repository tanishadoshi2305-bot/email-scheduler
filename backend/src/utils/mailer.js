const nodemailer = require("nodemailer");

let transporter = null;
let etherealCredentials = null;
let initPromise = null;

/**
 * Initializes the Nodemailer Ethereal SMTP transport using .env credentials
 * or by automatically creating a fresh Ethereal test account.
 */
async function initMailer() {
  if (transporter) {
    return transporter;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const envUser = process.env.ETHEREAL_USER?.trim();
    const envPass = process.env.ETHEREAL_PASS?.trim();

    if (envUser && envPass) {
      etherealCredentials = {
        user: envUser,
        pass: envPass,
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        generated: false,
      };

      transporter = nodemailer.createTransport({
        host: etherealCredentials.host,
        port: etherealCredentials.port,
        secure: etherealCredentials.secure,
        auth: {
          user: etherealCredentials.user,
          pass: etherealCredentials.pass,
        },
      });

      console.log(`[Mailer] Using configured Ethereal account: ${etherealCredentials.user}`);
      return transporter;
    }

    const testAccount = await nodemailer.createTestAccount();

    etherealCredentials = {
      user: testAccount.user,
      pass: testAccount.pass,
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      web: testAccount.web,
      generated: true,
    };

    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    console.log("[Mailer] Generated Ethereal test account:");
    console.log(`  User: ${testAccount.user}`);
    console.log(`  Pass: ${testAccount.pass}`);
    console.log(`  Web:  ${testAccount.web || "https://ethereal.email"}`);

    return transporter;
  })();

  try {
    return await initPromise;
  } catch (err) {
    initPromise = null;
    throw err;
  }
}

/**
 * Returns the active Nodemailer transporter, initializing it if needed.
 */
async function getTransporter() {
  if (!transporter) {
    await initMailer();
  }
  return transporter;
}

/**
 * Sends an email via Ethereal SMTP and returns the Nodemailer info and preview URL.
 */
async function sendEmail({ to, subject, body, text, html, senderName, replyTo }) {
  const activeTransporter = await getTransporter();
  const fromAddress = "noreply@dispatch.app";
  const displayName = (senderName || "Dispatch Studio").replace(/"/g, "");

  const plainText = typeof text === "string" ? text : typeof body === "string" ? body : "";
  const mailOptions = {
    from: `"${displayName}" <${fromAddress}>`,
    to,
    subject,
    ...(replyTo ? { replyTo } : {}),
    text: plainText,
    ...(html ? { html } : {}),
  };

  const info = await activeTransporter.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl(info) || null;

  return { info, previewUrl };
}

module.exports = {
  initMailer,
  getTransporter,
  sendEmail,
};
