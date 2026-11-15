import React, { useEffect } from "react";
import {
  AlertCircle,
  CalendarClock,
  CopyPlus,
  ExternalLink,
  Mail,
  X,
} from "lucide-react";
import StationeryPreview, { getTemplateMeta } from "./StationeryPreview";

function formatFullDateTime(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getStatusBadgeStyles(status) {
  switch (status) {
    case "SENT":
      return "bg-[#E2F0E6] text-[#225238] border-[#2E6049]";
    case "FAILED":
      return "bg-[#FFF0F2] text-[#8E2233] border-[#9E2A3B]";
    case "CANCELLED":
      return "bg-[#EAE3DA] text-[#3A2327]/70 border-[#3A2327]/40";
    case "SCHEDULED":
    default:
      return "bg-[#B8CEDD]/60 text-[#3A2327] border-[#3A2327]";
  }
}

export default function EmailInspectorDrawer({
  email,
  onClose,
  onDuplicate,
}) {
  useEffect(() => {
    if (!email) return undefined;
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [email, onClose]);

  if (!email) return null;

  const templateMeta = getTemplateMeta(email.template || "editorial");

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#3A2327]/45 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        aria-label="Email Inspector Drawer"
        className="w-full max-w-xl h-full bg-[#FAF6F0] border-l-2 border-[#3A2327] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="bg-[#F3DCE6] border-b-[1.5px] border-[#3A2327] px-6 py-4 flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeStyles(
                  email.status
                )}`}
              >
                {email.status}
              </span>
              <span className="inline-flex items-center rounded-full bg-[#FAF6F0] border border-[#3A2327]/60 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#3A2327]">
                {templateMeta.name}
              </span>
            </div>

            <div>
              <h3 className="font-display text-xl font-semibold text-[#3A2327] truncate">
                {email.recipientName || email.recipient}
              </h3>
              {email.recipientName ? (
                <p className="text-xs font-mono text-[#3A2327]/75 truncate">
                  {email.recipient}
                </p>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close inspector drawer"
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#FAF6F0] border-[1.5px] border-[#3A2327] text-[#3A2327] hover:bg-[#3A2327] hover:text-[#FAF6F0] transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-white border border-[#3A2327]/35 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#3A2327]/60 flex items-center gap-1">
                <CalendarClock className="w-3 h-3" />
                Scheduled At
              </p>
              <p className="mt-1 text-xs font-medium text-[#3A2327]">
                {formatFullDateTime(email.scheduledAt)}
              </p>
            </div>

            <div className="rounded-xl bg-white border border-[#3A2327]/35 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#3A2327]/60 flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {email.sentAt ? "Delivered At" : "Created At"}
              </p>
              <p className="mt-1 text-xs font-medium text-[#3A2327]">
                {email.sentAt
                  ? formatFullDateTime(email.sentAt)
                  : formatFullDateTime(email.createdAt)}
              </p>
            </div>
          </div>

          {email.status === "FAILED" && email.error ? (
            <div className="rounded-2xl bg-[#FFF0F2] border-[1.5px] border-[#9E2A3B] p-4 flex items-start gap-2.5 text-xs text-[#7A1D2B]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold uppercase tracking-wider">Delivery Error</p>
                <p className="leading-relaxed">{email.error}</p>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-[#3A2327]">
              Rendered Stationery Copy
            </p>
            <StationeryPreview
              template={email.template || "editorial"}
              subject={email.subject}
              body={email.body}
              recipientName={email.recipientName}
              recipientEmail={email.recipient}
              compact
            />
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="border-t-[1.5px] border-[#3A2327] bg-[#FAF6F0] px-6 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {email.previewUrl ? (
            <a
              href={email.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#B8CEDD]/55 border-[1.5px] border-[#3A2327] px-4 py-2 text-xs font-semibold text-[#3A2327] hover:bg-[#B8CEDD] transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View Ethereal Email
            </a>
          ) : (
            <span className="text-xs text-[#3A2327]/55">
              Ethereal preview available after delivery
            </span>
          )}

          <button
            type="button"
            onClick={() => onDuplicate(email)}
            className="inline-flex items-center gap-2 rounded-full bg-[#3A2327] border-[1.5px] border-[#3A2327] px-5 py-2.5 text-xs sm:text-sm font-semibold text-[#FAF6F0] hover:bg-[#3A2327]/90 transition shadow-editorialSm"
          >
            <CopyPlus className="w-4 h-4" />
            Duplicate &amp; Schedule Again
          </button>
        </div>
      </aside>
    </div>
  );
}
