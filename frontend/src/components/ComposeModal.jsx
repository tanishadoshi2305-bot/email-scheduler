import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Send,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { emailsApi } from "../api/client";
import { parseContactsCsv } from "../utils/csv";
import StationeryPreview, {
  STATIONERY_TEMPLATES,
} from "./StationeryPreview";
import StarburstIcon from "./StarburstIcon";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toLocalDateTimeInput(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/**
 * Split recipient text by commas, semicolons, or newlines while keeping quoted names
 * and `Name <email>` tokens intact.
 */
function splitRecipientTokens(rawText) {
  const tokens = [];
  let current = "";
  let inQuotes = false;
  let inBrackets = false;

  for (let i = 0; i < rawText.length; i += 1) {
    const ch = rawText[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if (ch === "<" && !inQuotes) {
      inBrackets = true;
      current += ch;
    } else if (ch === ">" && !inQuotes) {
      inBrackets = false;
      current += ch;
    } else if ((ch === "," || ch === ";" || ch === "\n" || ch === "\r") && !inQuotes && !inBrackets) {
      if (current.trim()) tokens.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }

  if (current.trim()) tokens.push(current.trim());
  return tokens;
}

function parseRecipientText(rawText) {
  const tokens = splitRecipientTokens(String(rawText || ""));
  const validMap = new Map();
  const invalidTokens = [];

  for (const token of tokens) {
    const angleMatch = token.match(/^(.*)<\s*([^<>\s]+)\s*>$/);
    let email = token.trim().toLowerCase();
    let name = null;

    if (angleMatch) {
      const cleanedName = angleMatch[1].trim().replace(/^["']|["']$/g, "");
      email = angleMatch[2].trim().toLowerCase();
      name = cleanedName || null;
    }

    if (!EMAIL_REGEX.test(email)) {
      invalidTokens.push(token);
      continue;
    }

    const existing = validMap.get(email);
    if (!existing) {
      validMap.set(email, { email, name });
    } else if (!existing.name && name) {
      existing.name = name;
    }
  }

  return {
    contacts: Array.from(validMap.values()),
    invalidTokens,
  };
}

function formatContactToken(contact) {
  if (contact.name) {
    const safeName = contact.name.includes(",")
      ? `"${contact.name.replace(/"/g, "")}"`
      : contact.name;
    return `${safeName} <${contact.email}>`;
  }
  return contact.email;
}

function formatContactLabel(contact) {
  return contact.name ? `${contact.name} <${contact.email}>` : contact.email;
}

export default function ComposeModal({
  isOpen,
  onClose,
  onScheduled,
  initialData = null,
}) {
  const [recipientsText, setRecipientsText] = useState("");
  const [template, setTemplate] = useState("editorial");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [scheduledAt, setScheduledAt] = useState(() =>
    toLocalDateTimeInput(new Date(Date.now() + 2 * 60 * 1000))
  );
  const [sendImmediately, setSendImmediately] = useState(false);
  const [staggerDelaySec, setStaggerDelaySec] = useState("0");
  const [csvStatus, setCsvStatus] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef(null);
  const bodyTextareaRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const defaultTime = toLocalDateTimeInput(new Date(Date.now() + 5 * 60 * 1000));

    if (initialData) {
      let initialRecipientString = "";
      if (Array.isArray(initialData.recipients)) {
        initialRecipientString = initialData.recipients
          .map((item) =>
            typeof item === "string" ? item : formatContactToken(item)
          )
          .join(", ");
      } else if (initialData.recipient) {
        initialRecipientString = formatContactToken({
          email: initialData.recipient,
          name: initialData.recipientName || null,
        });
      }

      setRecipientsText(initialRecipientString);
      setTemplate(initialData.template || "editorial");
      setSubject(initialData.subject || "");
      setBody(initialData.body || "");
      setScheduledAt(defaultTime);
      setSendImmediately(false);
      setStaggerDelaySec(String(initialData.staggerDelaySec ?? 0));
    } else {
      setRecipientsText("");
      setTemplate("editorial");
      setSubject("");
      setBody("");
      setScheduledAt(defaultTime);
      setSendImmediately(false);
      setStaggerDelaySec("0");
    }

    setCsvStatus(null);
    setError("");
  }, [isOpen, initialData]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  const parsedRecipients = useMemo(
    () => parseRecipientText(recipientsText),
    [recipientsText]
  );

  const firstPreviewContact = parsedRecipients.contacts[0] || {
    name: "Alex",
    email: "alex@example.com",
  };

  if (!isOpen) return null;

  const applyPreset = (minutesOffset) => {
    if (minutesOffset === 0) {
      setSendImmediately(true);
      setScheduledAt(toLocalDateTimeInput(new Date()));
      return;
    }
    setSendImmediately(false);
    setScheduledAt(
      toLocalDateTimeInput(new Date(Date.now() + minutesOffset * 60 * 1000))
    );
  };

  const handleInsertMergeTag = (tag) => {
    const textarea = bodyTextareaRef.current;
    if (!textarea) {
      setBody((prev) => (prev ? `${prev} ${tag}` : tag));
      return;
    }

    const start = textarea.selectionStart ?? body.length;
    const end = textarea.selectionEnd ?? body.length;
    const nextValue = body.slice(0, start) + tag + body.slice(end);
    setBody(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      const cursorPos = start + tag.length;
      textarea.setSelectionRange(cursorPos, cursorPos);
    });
  };

  const handleRemoveContact = (emailToRemove) => {
    const remaining = parsedRecipients.contacts.filter(
      (c) => c.email !== emailToRemove
    );
    const preservedInvalid = parsedRecipients.invalidTokens;
    const nextTokens = [
      ...remaining.map(formatContactToken),
      ...preservedInvalid,
    ];
    setRecipientsText(nextTokens.join(", "));
  };

  const handleCsvUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError("");
    try {
      const text = await file.text();
      const { contacts, skippedCount } = parseContactsCsv(text);

      if (contacts.length === 0) {
        setCsvStatus({
          type: "error",
          message: `No valid email addresses found in ${file.name}. Ensure the file has an email column.`,
        });
        return;
      }

      const merged = new Map();
      for (const existing of parsedRecipients.contacts) {
        merged.set(existing.email, { ...existing });
      }
      for (const incoming of contacts) {
        const current = merged.get(incoming.email);
        if (!current) {
          merged.set(incoming.email, incoming);
        } else if (!current.name && incoming.name) {
          current.name = incoming.name;
        }
      }

      const mergedList = Array.from(merged.values());
      setRecipientsText(mergedList.map(formatContactToken).join(", "));
      setCsvStatus({
        type: "success",
        message:
          `Imported ${contacts.length} contact${contacts.length === 1 ? "" : "s"} from ${file.name}` +
          (skippedCount > 0 ? ` (${skippedCount} invalid skipped)` : "."),
      });
    } catch {
      setCsvStatus({
        type: "error",
        message: `Could not read ${file.name}. Please upload a UTF-8 .csv file.`,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const { contacts, invalidTokens } = parsedRecipients;
    if (contacts.length === 0) {
      setError("Please enter at least one valid recipient email address.");
      return;
    }
    if (invalidTokens.length > 0) {
      setError(
        `Invalid email format: ${invalidTokens.slice(0, 3).join(", ")}${
          invalidTokens.length > 3 ? "..." : ""
        }`
      );
      return;
    }
    if (!subject.trim()) {
      setError("Please enter an email subject line.");
      return;
    }
    if (!body.trim()) {
      setError("Please write your message copy.");
      return;
    }

    let scheduledDate;
    if (sendImmediately) {
      scheduledDate = new Date();
    } else {
      scheduledDate = new Date(scheduledAt);
      if (Number.isNaN(scheduledDate.getTime())) {
        setError("Please pick a valid schedule date and time.");
        return;
      }
    }

    const staggerSecondsNum = Math.max(0, Number(staggerDelaySec) || 0);
    const staggerDelayMs = Math.round(staggerSecondsNum * 1000);

    setSubmitting(true);
    try {
      const response = await emailsApi.schedule({
        recipients: contacts,
        subject: subject.trim(),
        body: body.trim(),
        template,
        scheduledAt: scheduledDate.toISOString(),
        staggerDelayMs,
      });

      if (onScheduled) {
        await onScheduled(response);
      }
      onClose();
    } catch (err) {
      setError(err.message || "Failed to schedule dispatch.");
    } finally {
      setSubmitting(false);
    }
  };

  const count = parsedRecipients.contacts.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#3A2327]/50 backdrop-blur-[2px] p-3 sm:p-5 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="my-auto w-full max-w-5xl rounded-3xl bg-[#FAF6F0] border-2 border-[#3A2327] shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="bg-[#F3DCE6] border-b-[1.5px] border-[#3A2327] px-5 sm:px-7 py-4 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <StarburstIcon className="w-5 h-5 text-[#3A2327]" title="" />
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-semibold text-[#3A2327] leading-tight">
                {initialData ? "Duplicate & Schedule Dispatch" : "Compose Scheduled Dispatch"}
              </h2>
              <p className="text-xs text-[#3A2327]/75">
                Pick stationery, personalize with merge tags, and preview your live letter.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close compose studio"
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#FAF6F0] border-[1.5px] border-[#3A2327] text-[#3A2327] hover:bg-[#3A2327] hover:text-[#FAF6F0] transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Two-Column Body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x-[1.5px] divide-[#3A2327]/20"
        >
          {/* Left Column: Composer Controls */}
          <div className="lg:col-span-7 p-5 sm:p-7 space-y-5">
            {error ? (
              <div className="rounded-2xl bg-[#FFF0F2] border-[1.5px] border-[#9E2A3B] px-4 py-3 flex items-start gap-2.5 text-sm text-[#7A1D2B]">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            ) : null}

            {/* Recipients + CSV Upload */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="compose-recipients"
                  className="text-xs font-bold uppercase tracking-wider text-[#3A2327]"
                >
                  Recipients {count > 0 ? `(${count})` : ""}
                </label>

                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleCsvUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#B8CEDD]/50 border border-[#3A2327] px-3 py-1 text-xs font-semibold text-[#3A2327] hover:bg-[#B8CEDD] transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload .csv
                  </button>
                </div>
              </div>

              <textarea
                id="compose-recipients"
                rows={2}
                value={recipientsText}
                onChange={(e) => setRecipientsText(e.target.value)}
                placeholder="Jane Doe <jane@example.com>, alex@studio.co (or upload a .csv)"
                className="w-full rounded-xl bg-white border-[1.5px] border-[#3A2327] px-3.5 py-2.5 text-sm text-[#3A2327] placeholder:text-[#3A2327]/40 focus:outline-none focus:ring-2 focus:ring-[#E6A8BF]"
              />

              {csvStatus ? (
                <p
                  className={`flex items-center gap-1.5 text-xs font-medium ${
                    csvStatus.type === "error" ? "text-[#9E2A3B]" : "text-[#2E6049]"
                  }`}
                >
                  {csvStatus.type === "error" ? (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{csvStatus.message}</span>
                </p>
              ) : null}

              {parsedRecipients.contacts.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
                  {parsedRecipients.contacts.map((contact) => (
                    <span
                      key={contact.email}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#F3DCE6]/80 border border-[#3A2327]/60 px-2.5 py-0.5 text-[11px] font-medium text-[#3A2327]"
                    >
                      <span className="max-w-[220px] truncate">
                        {formatContactLabel(contact)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveContact(contact.email)}
                        aria-label={`Remove ${contact.email}`}
                        className="hover:text-[#9E2A3B] transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Stationery Style Selector */}
            <div className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-wider text-[#3A2327]">
                Stationery Style
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {STATIONERY_TEMPLATES.map((tpl) => {
                  const selected = template === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setTemplate(tpl.id)}
                      className={`text-left rounded-xl border-[1.5px] p-3 transition flex flex-col justify-between gap-1.5 ${
                        selected
                          ? "bg-[#F3DCE6] border-[#3A2327] shadow-editorialSm"
                          : "bg-white border-[#3A2327]/35 hover:border-[#3A2327]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-[#3A2327]"
                          style={{ backgroundColor: tpl.swatchColor }}
                        />
                        {selected ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider rounded-full bg-[#3A2327] text-[#FAF6F0] px-2 py-0.5">
                            Selected
                          </span>
                        ) : null}
                      </div>
                      <div>
                        <p className="font-display text-sm font-semibold text-[#3A2327]">
                          {tpl.name}
                        </p>
                        <p className="text-[11px] text-[#3A2327]/70 leading-snug mt-0.5">
                          {tpl.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subject Line */}
            <div className="space-y-1.5">
              <label
                htmlFor="compose-subject"
                className="block text-xs font-bold uppercase tracking-wider text-[#3A2327]"
              >
                Subject Line
              </label>
              <input
                id="compose-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="An update tailored for {{name}}"
                className="w-full rounded-xl bg-white border-[1.5px] border-[#3A2327] px-3.5 py-2.5 text-sm text-[#3A2327] placeholder:text-[#3A2327]/40 focus:outline-none focus:ring-2 focus:ring-[#E6A8BF]"
              />
            </div>

            {/* Message Body + Merge Tag Chips */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="compose-body"
                  className="text-xs font-bold uppercase tracking-wider text-[#3A2327]"
                >
                  Message Body
                </label>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-[#3A2327]/60 mr-0.5">Insert tag:</span>
                  <button
                    type="button"
                    onClick={() => handleInsertMergeTag("{{name}}")}
                    className="rounded-full bg-[#F3DCE6] border border-[#3A2327] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#3A2327] hover:bg-[#E6A8BF] transition"
                  >
                    + {"{{name}}"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertMergeTag("{{email}}")}
                    className="rounded-full bg-[#B8CEDD]/60 border border-[#3A2327] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#3A2327] hover:bg-[#B8CEDD] transition"
                  >
                    + {"{{email}}"}
                  </button>
                </div>
              </div>

              <textarea
                id="compose-body"
                ref={bodyTextareaRef}
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Hello {{name}},&#10;&#10;Writing to share our scheduled dispatch..."
                className="w-full rounded-xl bg-white border-[1.5px] border-[#3A2327] px-3.5 py-2.5 text-sm text-[#3A2327] placeholder:text-[#3A2327]/40 focus:outline-none focus:ring-2 focus:ring-[#E6A8BF] leading-relaxed"
              />
            </div>

            {/* Schedule & Bulk Stagger Controls */}
            <div className="rounded-2xl bg-[#F3DCE6]/45 border-[1.5px] border-[#3A2327]/40 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#3A2327]">
                  <CalendarClock className="w-3.5 h-3.5" />
                  Schedule Timing
                </span>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyPreset(0)}
                    className={`rounded-full border border-[#3A2327] px-2.5 py-0.5 text-[11px] font-semibold transition ${
                      sendImmediately
                        ? "bg-[#3A2327] text-[#FAF6F0]"
                        : "bg-[#FAF6F0] text-[#3A2327] hover:bg-[#E6A8BF]/60"
                    }`}
                  >
                    Send Now
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset(1)}
                    className="rounded-full bg-[#FAF6F0] border border-[#3A2327] px-2.5 py-0.5 text-[11px] font-semibold text-[#3A2327] hover:bg-[#E6A8BF]/60 transition"
                  >
                    +1 Min
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset(2)}
                    className="rounded-full bg-[#FAF6F0] border border-[#3A2327] px-2.5 py-0.5 text-[11px] font-semibold text-[#3A2327] hover:bg-[#E6A8BF]/60 transition"
                  >
                    +2 Min
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset(60)}
                    className="rounded-full bg-[#FAF6F0] border border-[#3A2327] px-2.5 py-0.5 text-[11px] font-semibold text-[#3A2327] hover:bg-[#E6A8BF]/60 transition"
                  >
                    +1 Hr
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="compose-scheduled-at"
                    className="block text-[11px] font-semibold text-[#3A2327]/75 mb-1"
                  >
                    Send Date &amp; Time
                  </label>
                  <input
                    id="compose-scheduled-at"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => {
                      setSendImmediately(false);
                      setScheduledAt(e.target.value);
                    }}
                    className="w-full rounded-xl bg-white border-[1.5px] border-[#3A2327] px-3 py-2 text-xs sm:text-sm text-[#3A2327] focus:outline-none focus:ring-2 focus:ring-[#E6A8BF]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="compose-stagger"
                    className="block text-[11px] font-semibold text-[#3A2327]/75 mb-1"
                  >
                    Bulk Stagger Delay (sec)
                  </label>
                  <input
                    id="compose-stagger"
                    type="number"
                    min="0"
                    step="1"
                    value={staggerDelaySec}
                    onChange={(e) => setStaggerDelaySec(e.target.value)}
                    className="w-full rounded-xl bg-white border-[1.5px] border-[#3A2327] px-3 py-2 text-xs sm:text-sm text-[#3A2327] focus:outline-none focus:ring-2 focus:ring-[#E6A8BF]"
                  />
                </div>
              </div>
            </div>

            {/* Submit Actions */}
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-[#FAF6F0] border-[1.5px] border-[#3A2327] px-5 py-2.5 text-sm font-semibold text-[#3A2327] hover:bg-[#F3DCE6]/50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-full bg-[#3A2327] border-[1.5px] border-[#3A2327] px-6 py-2.5 text-sm font-semibold text-[#FAF6F0] hover:bg-[#3A2327]/90 transition shadow-editorialSm disabled:opacity-60"
              >
                <Send className="w-4 h-4" />
                {submitting
                  ? "Scheduling..."
                  : sendImmediately
                  ? `Send ${count > 1 ? `${count} Dispatches` : "Dispatch"} Now`
                  : `Schedule ${count > 1 ? `${count} Dispatches` : "Dispatch"}`}
              </button>
            </div>
          </div>

          {/* Right Column: Live Stationery Preview */}
          <div className="lg:col-span-5 bg-[#F5EFE6] p-5 sm:p-6 flex flex-col justify-between gap-4">
            <div className="space-y-3 lg:sticky lg:top-0">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#3A2327]">
                  <Sparkles className="w-3.5 h-3.5" />
                  Live Stationery Preview
                </span>
                <span className="rounded-full bg-[#FAF6F0] border border-[#3A2327]/40 px-2.5 py-0.5 text-[11px] font-mono text-[#3A2327]/80 max-w-[190px] truncate">
                  {firstPreviewContact.name || firstPreviewContact.email}
                </span>
              </div>

              <StationeryPreview
                template={template}
                subject={subject}
                body={body}
                recipientName={firstPreviewContact.name}
                recipientEmail={firstPreviewContact.email}
              />

              <p className="text-[11px] text-[#3A2327]/65 leading-relaxed">
                Merge tags like <code className="font-mono text-[#3A2327]">{"{{name}}"}</code> and{" "}
                <code className="font-mono text-[#3A2327]">{"{{email}}"}</code> automatically personalize
                for each recipient upon delivery.
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
