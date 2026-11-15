import React from "react";

export const STATIONERY_TEMPLATES = [
  {
    id: "editorial",
    name: "Classic Editorial",
    shortName: "Classic Editorial",
    description: "Warm cream stationery framed with bordeaux borders and serif display type.",
    pillLabel: "DISPATCH EDITORIAL",
    accentBg: "bg-[#FAF6F0]",
    swatchColor: "#3A2327",
  },
  {
    id: "blush",
    name: "Blush Event Card",
    shortName: "Blush Event Card",
    description: "Soft blush outer card with dusty rose invitation tags and inset cream letter.",
    pillLabel: "INVITATION CARD",
    accentBg: "bg-[#F3DCE6]",
    swatchColor: "#E6A8BF",
  },
  {
    id: "minimal",
    name: "Minimalist Note",
    shortName: "Minimalist Note",
    description: "Clean ivory letterpad with quiet typographic rules for personal notes.",
    pillLabel: "MINIMAL NOTE",
    accentBg: "bg-[#FFFDF9]",
    swatchColor: "#B8CEDD",
  },
];

export function getTemplateMeta(templateId) {
  return (
    STATIONERY_TEMPLATES.find((t) => t.id === templateId) ||
    STATIONERY_TEMPLATES[0]
  );
}

/**
 * Replace `{{name}}` and `{{email}}` merge tags using the same fallback rules
 * as the backend renderer.
 */
export function resolveMergeTags(text, { recipientName, recipientEmail } = {}) {
  const email = String(recipientEmail || "alex@example.com").trim() || "alex@example.com";
  const explicitName = String(recipientName || "").trim();
  const localPart = email.split("@")[0] || "Alex";
  const resolvedName = explicitName || localPart;

  return String(text || "")
    .replace(/\{\{\s*name\s*\}\}/gi, resolvedName)
    .replace(/\{\{\s*email\s*\}\}/gi, email);
}

function renderParagraphs(bodyText, textClassName = "text-[#3A2327]/90") {
  const trimmed = String(bodyText || "").trim();
  if (!trimmed) {
    return (
      <p className="text-sm italic text-[#3A2327]/45 leading-relaxed">
        Your written note will render here on bespoke digital stationery. Try inserting{" "}
        <span className="font-mono text-xs not-italic text-[#3A2327]/65">{"{{name}}"}</span>{" "}
        to personalize each recipient&apos;s copy.
      </p>
    );
  }

  return trimmed.split(/\n\s*\n/).map((para, idx) => (
    <p key={idx} className={`text-sm leading-relaxed ${textClassName}`}>
      {para.split("\n").map((line, lineIdx, arr) => (
        <React.Fragment key={lineIdx}>
          {line}
          {lineIdx < arr.length - 1 ? <br /> : null}
        </React.Fragment>
      ))}
    </p>
  ));
}

/**
 * Visual stationery preview mirroring Dispatch's 3 email HTML layouts:
 * `"editorial"`, `"blush"`, and `"minimal"`.
 */
export default function StationeryPreview({
  template = "editorial",
  subject = "",
  body = "",
  recipientName = "Alex",
  recipientEmail = "alex@example.com",
  compact = false,
}) {
  const resolvedSubject = resolveMergeTags(subject, {
    recipientName,
    recipientEmail,
  }).trim();
  const resolvedBody = resolveMergeTags(body, {
    recipientName,
    recipientEmail,
  });

  if (template === "blush") {
    return (
      <div className="rounded-2xl bg-[#F3DCE6] border-[1.5px] border-[#3A2327] p-4 sm:p-5">
        <div className="rounded-2xl bg-[#FAF6F0] border-[1.5px] border-[#3A2327] overflow-hidden shadow-editorialSm">
          <div className="bg-[#3A2327] px-5 py-3 flex items-center justify-between gap-2 text-[#FAF6F0]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E6A8BF] border border-[#FAF6F0]/30 px-2.5 py-0.5 text-[10px] font-bold tracking-[0.14em] uppercase text-[#3A2327]">
              ✳ Dispatch Invitation
            </span>
            <span className="text-[11px] font-mono text-[#FAF6F0]/75 truncate">
              To: {recipientName ? `${recipientName} ` : ""}
              &lt;{recipientEmail}&gt;
            </span>
          </div>

          <div className={compact ? "p-4 space-y-3" : "p-6 space-y-4"}>
            <div className="rounded-xl bg-[#F3DCE6]/70 border border-[#3A2327] px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#3A2327]/70 mb-1">
                From Dispatch Studio
              </p>
              <h4 className="font-display text-lg sm:text-xl font-semibold text-[#3A2327] leading-snug break-words">
                {resolvedSubject || "Untitled Dispatch"}
              </h4>
            </div>

            <div className="space-y-3 pt-1">{renderParagraphs(resolvedBody)}</div>

            <div className="pt-3 border-t border-dashed border-[#3A2327]/25 flex items-center justify-between text-[11px] text-[#3A2327]/65">
              <span className="font-medium">With care, Dispatch Studio</span>
              <span>Blush Event Card</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (template === "minimal") {
    return (
      <div className="rounded-2xl bg-[#FAF6F0] border border-[#3A2327]/30 p-3 sm:p-4">
        <div className="rounded-xl bg-[#FFFDF9] border border-[#3A2327]/25 p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#3A2327]/15 pb-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#3A2327]/70">
              Dispatch · Note
            </span>
            <span className="text-[11px] font-mono text-[#3A2327]/60 truncate">
              To: {recipientEmail}
            </span>
          </div>

          <h4 className="font-display text-lg sm:text-xl font-medium text-[#3A2327] leading-snug break-words">
            {resolvedSubject || "Untitled Dispatch"}
          </h4>

          <div className="space-y-3">{renderParagraphs(resolvedBody, "text-[#3A2327]/85")}</div>

          <div className="pt-3 border-t border-[#3A2327]/15 flex items-center justify-between text-[11px] text-[#3A2327]/55">
            <span>Sent via Dispatch Studio</span>
            <span>Minimalist Note</span>
          </div>
        </div>
      </div>
    );
  }

  // Default: "editorial" — Classic Editorial Letter
  return (
    <div className="rounded-2xl bg-[#FAF6F0] border-[1.5px] border-[#3A2327] overflow-hidden shadow-editorialSm">
      <div className="bg-[#F3DCE6] border-b-[1.5px] border-[#3A2327] px-5 py-3 flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#3A2327] px-3 py-0.5 text-[10px] font-bold tracking-[0.14em] uppercase text-[#FAF6F0]">
          ✳ DISPATCH
        </span>
        <span className="text-[11px] font-mono text-[#3A2327]/80 truncate">
          To: {recipientName ? `${recipientName} ` : ""}
          &lt;{recipientEmail}&gt;
        </span>
      </div>

      <div className={compact ? "p-4 sm:p-5 space-y-3" : "p-6 space-y-4"}>
        <div className="border-b border-[#3A2327]/20 pb-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#3A2327]/60 mb-1">
            Editorial Letter
          </p>
          <h4 className="font-display text-lg sm:text-xl font-semibold text-[#3A2327] leading-snug break-words">
            {resolvedSubject || "Untitled Dispatch"}
          </h4>
        </div>

        <div className="space-y-3">{renderParagraphs(resolvedBody)}</div>

        <div className="pt-4 border-t border-[#3A2327]/20 flex items-center justify-between text-[11px] text-[#3A2327]/65">
          <span className="font-display italic">Dispatch Studio — Scheduled Correspondence</span>
          <span className="font-semibold uppercase tracking-wider text-[10px]">Editorial</span>
        </div>
      </div>
    </div>
  );
}
