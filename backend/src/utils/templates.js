const VALID_TEMPLATES = ["editorial", "blush", "minimal"];

function normalizeTemplate(template) {
  if (typeof template !== "string") return "editorial";
  const normalized = template.trim().toLowerCase();
  return VALID_TEMPLATES.includes(normalized) ? normalized : "editorial";
}

function resolveRecipientName(name, email) {
  if (typeof name === "string" && name.trim()) {
    return name.trim();
  }
  if (typeof email === "string" && email.includes("@")) {
    const local = email.split("@")[0].trim();
    if (local) return local;
  }
  return "Friend";
}

/**
 * Replaces {{name}} and {{email}} merge tags inside a subject or body string.
 */
function personalizeText(text, { name, email } = {}) {
  if (typeof text !== "string") return "";

  const resolvedName = resolveRecipientName(name, email);
  const resolvedEmail = typeof email === "string" ? email.trim() : "";

  return text
    .replace(/\{\{\s*name\s*\}\}/gi, resolvedName)
    .replace(/\{\{\s*email\s*\}\}/gi, resolvedEmail);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatParagraphsHtml(text, paragraphStyle) {
  const blocks = String(text ?? "")
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return `<p style="${paragraphStyle}">&nbsp;</p>`;
  }

  return blocks
    .map((block) => {
      const withBreaks = escapeHtml(block).replace(/\r?\n/g, "<br />");
      return `<p style="${paragraphStyle}">${withBreaks}</p>`;
    })
    .join("");
}

/**
 * Renders an inline-styled HTML email matching one of Dispatch's three
 * retro-editorial stationery templates: "editorial", "blush", or "minimal".
 */
function renderStationeryHtml({
  template = "editorial",
  subject = "",
  body = "",
  recipientName = "",
  recipientEmail = "",
}) {
  const activeTemplate = normalizeTemplate(template);
  const resolvedSubject = personalizeText(subject, {
    name: recipientName,
    email: recipientEmail,
  });
  const resolvedBody = personalizeText(body, {
    name: recipientName,
    email: recipientEmail,
  });
  const displayName = resolveRecipientName(recipientName, recipientEmail);
  const safeSubject = escapeHtml(resolvedSubject);
  const safeRecipient = escapeHtml(
    recipientEmail ? `${displayName} <${recipientEmail}>` : displayName
  );

  if (activeTemplate === "blush") {
    const bodyHtml = formatParagraphsHtml(
      resolvedBody,
      "margin: 0 0 16px 0; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 15px; line-height: 1.75; color: #3A2327;"
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeSubject}</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #FAF6F0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #FAF6F0; border: 2px solid #3A2327; border-radius: 18px; overflow: hidden;">
          <tr>
            <td align="center" style="background-color: #F3DCE6; padding: 34px 32px 28px 32px; border-bottom: 2px solid #3A2327;">
              <div style="display: inline-block; padding: 6px 16px; border-radius: 999px; background-color: #E6A8BF; border: 1.5px solid #3A2327; font-family: 'Plus Jakarta Sans', Arial, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #3A2327;">
                &#10035; DISPATCH EDITION
              </div>
              <h1 style="margin: 18px 0 8px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 28px; line-height: 1.25; font-weight: 600; color: #3A2327;">
                ${safeSubject}
              </h1>
              <p style="margin: 0; font-family: 'Plus Jakarta Sans', Arial, sans-serif; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #3A2327; opacity: 0.78;">
                Prepared for ${safeRecipient}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 34px 20px 34px; background-color: #FAF6F0;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 18px 32px; background-color: #3A2327; color: #FAF6F0; font-family: Georgia, 'Times New Roman', serif; font-size: 13px; letter-spacing: 0.06em;">
              &#10035; DISPATCH STUDIO &middot; SCHEDULED CORRESPONDENCE
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  if (activeTemplate === "minimal") {
    const bodyHtml = formatParagraphsHtml(
      resolvedBody,
      "margin: 0 0 16px 0; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 15px; line-height: 1.8; color: #3A2327;"
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeSubject}</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #FAF6F0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center">
        <table role="presentation" width="580" cellspacing="0" cellpadding="0" border="0" style="max-width: 580px; width: 100%; background-color: #FFFDF9; border: 1.5px solid #3A2327; border-top: 6px solid #3A2327; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="padding: 28px 34px 18px 34px; border-bottom: 1px solid #E6A8BF;">
              <p style="margin: 0 0 8px 0; font-family: 'Plus Jakarta Sans', Arial, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #3A2327; opacity: 0.65;">
                Note for ${safeRecipient}
              </p>
              <h1 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 24px; line-height: 1.3; font-weight: 600; color: #3A2327;">
                ${safeSubject}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 34px 18px 34px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding: 18px 34px 26px 34px; border-top: 1px solid rgba(58, 35, 39, 0.15);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="vertical-align: middle;">
                    <span style="display: inline-block; width: 28px; height: 28px; line-height: 28px; text-align: center; border-radius: 999px; background-color: #3A2327; color: #FAF6F0; font-family: Georgia, serif; font-size: 13px; font-weight: 700;">
                      D
                    </span>
                    <span style="margin-left: 10px; font-family: Georgia, 'Times New Roman', serif; font-size: 13px; color: #3A2327;">
                      Sent via Dispatch Studio
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  // Default: "editorial" (Classic Editorial Letter)
  const bodyHtml = formatParagraphsHtml(
    resolvedBody,
    "margin: 0 0 16px 0; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 15px; line-height: 1.75; color: #3A2327;"
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeSubject}</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #FAF6F0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #FAF6F0; border: 2px solid #3A2327; border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="background-color: #3A2327; padding: 20px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <span style="display: inline-block; padding: 6px 16px; border-radius: 999px; background-color: #FAF6F0; border: 1.5px solid #FAF6F0; font-family: Georgia, 'Times New Roman', serif; font-size: 13px; font-weight: 700; letter-spacing: 0.18em; color: #3A2327;">
                      &#10035; DISPATCH
                    </span>
                  </td>
                  <td align="right" style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #E6A8BF;">
                    Editorial Letter
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 14px 32px; background-color: #F3DCE6; border-bottom: 1.5px solid #3A2327; font-family: 'Plus Jakarta Sans', Arial, sans-serif; font-size: 12px; color: #3A2327;">
              <strong>To:</strong> ${safeRecipient}
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 32px 16px 32px;">
              <h1 style="margin: 0 0 20px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 26px; line-height: 1.25; font-weight: 600; color: #3A2327;">
                ${safeSubject}
              </h1>
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding: 18px 32px 24px 32px; border-top: 1.5px solid rgba(58, 35, 39, 0.2);">
              <p style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 13px; font-style: italic; color: #3A2327; opacity: 0.8;">
                Dispatch Studio &middot; Crafted for Intentional Communication
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

module.exports = {
  VALID_TEMPLATES,
  normalizeTemplate,
  resolveRecipientName,
  personalizeText,
  renderStationeryHtml,
};
