const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Parse RFC-style CSV text into an array of string rows,
 * handling quoted fields, escaped quotes (""), and CRLF/LF newlines.
 */
export function parseCsvRows(csvText) {
  const text = String(csvText || "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\r") {
      if (text[i + 1] === "\n") {
        i += 1;
      }
      row.push(field);
      if (row.some((cell) => cell.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      if (row.some((cell) => cell.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) {
    rows.push(row);
  }

  return rows;
}

function extractEmailAndName(rawEmailCell, rawNameCell = "") {
  const emailCell = String(rawEmailCell || "").trim();
  const explicitName = String(rawNameCell || "").trim();

  const angleMatch = emailCell.match(/^(.*)<\s*([^<>\s]+)\s*>$/);
  if (angleMatch) {
    const bracketName = angleMatch[1].trim().replace(/^["']|["']$/g, "");
    return {
      email: angleMatch[2].trim().toLowerCase(),
      name: explicitName || bracketName || null,
    };
  }

  return {
    email: emailCell.toLowerCase(),
    name: explicitName || null,
  };
}

/**
 * Parse uploaded CSV contact lists into `{ email, name }` objects.
 * Supports header rows (`email`, `name`, `full name`, `first name` / `last name`)
 * as well as headerless 1- or 2-column CSV files.
 */
export function parseContactsCsv(csvText) {
  const rows = parseCsvRows(csvText);
  if (rows.length === 0) {
    return { contacts: [], totalRows: 0, skippedCount: 0 };
  }

  const normalizedHeaders = rows[0].map((cell) =>
    cell.trim().toLowerCase().replace(/[_-]+/g, " ")
  );

  let emailIdx = normalizedHeaders.findIndex((h) =>
    ["email", "e mail", "email address", "recipient", "mail"].includes(h)
  );
  let nameIdx = normalizedHeaders.findIndex((h) =>
    ["name", "full name", "recipient name", "contact name"].includes(h)
  );
  const firstNameIdx = normalizedHeaders.findIndex((h) =>
    ["first name", "firstname", "given name"].includes(h)
  );
  const lastNameIdx = normalizedHeaders.findIndex((h) =>
    ["last name", "lastname", "surname"].includes(h)
  );

  const hasHeaderRow = emailIdx !== -1 || nameIdx !== -1 || firstNameIdx !== -1;
  const startRow = hasHeaderRow ? 1 : 0;

  const dedupedMap = new Map();
  let totalRows = 0;
  let skippedCount = 0;

  for (let r = startRow; r < rows.length; r += 1) {
    const cols = rows[r];
    if (!cols || cols.every((c) => c.trim() === "")) continue;
    totalRows += 1;

    let rawEmail = "";
    let rawName = "";

    if (hasHeaderRow && emailIdx !== -1) {
      rawEmail = cols[emailIdx] || "";
      if (nameIdx !== -1) {
        rawName = cols[nameIdx] || "";
      } else if (firstNameIdx !== -1 || lastNameIdx !== -1) {
        rawName = [
          firstNameIdx !== -1 ? (cols[firstNameIdx] || "").trim() : "",
          lastNameIdx !== -1 ? (cols[lastNameIdx] || "").trim() : "",
        ]
          .filter(Boolean)
          .join(" ");
      }
    } else {
      // Headerless or header missing an explicit email column: detect first valid email column
      const detectedIdx = cols.findIndex((cell) => {
        const parsed = extractEmailAndName(cell);
        return EMAIL_REGEX.test(parsed.email);
      });

      if (detectedIdx !== -1) {
        rawEmail = cols[detectedIdx];
        if (nameIdx !== -1 && nameIdx !== detectedIdx) {
          rawName = cols[nameIdx] || "";
        } else {
          rawName = cols.find((_, idx) => idx !== detectedIdx && cols[idx]?.trim()) || "";
        }
      }
    }

    const { email, name } = extractEmailAndName(rawEmail, rawName);
    if (!EMAIL_REGEX.test(email)) {
      skippedCount += 1;
      continue;
    }

    const existing = dedupedMap.get(email);
    if (!existing) {
      dedupedMap.set(email, { email, name: name || null });
    } else if (!existing.name && name) {
      existing.name = name;
    }
  }

  return {
    contacts: Array.from(dedupedMap.values()),
    totalRows,
    skippedCount,
  };
}

function escapeCsvField(value) {
  const str = value == null ? "" : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatCsvDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString();
}

/**
 * Download an array of EmailJob records as a standards-compliant .csv file.
 */
export function exportEmailsToCsv(emails, filename = "dispatch-email-history.csv") {
  const headers = [
    "Recipient",
    "Name",
    "Subject",
    "Template",
    "Status",
    "Scheduled At",
    "Sent At",
    "Preview URL",
  ];

  const lines = [headers.map(escapeCsvField).join(",")];

  for (const email of emails || []) {
    const row = [
      email.recipient || "",
      email.recipientName || "",
      email.subject || "",
      email.template || "editorial",
      email.status || "",
      formatCsvDate(email.scheduledAt),
      formatCsvDate(email.sentAt),
      email.previewUrl || "",
    ];
    lines.push(row.map(escapeCsvField).join(","));
  }

  const csvContent = "\uFEFF" + lines.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
