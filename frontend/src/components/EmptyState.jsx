import StarburstIcon from "./StarburstIcon";

/**
 * Retro-editorial empty state featuring the Outbox 8-point starburst motif.
 */
export default function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F3DCE6] border-[1.5px] border-[#3A2327] mb-4">
        <StarburstIcon className="w-8 h-8 text-[#3A2327]" title="" />
      </div>
      <h3 className="font-display text-2xl font-semibold text-[#3A2327]">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-sm text-[#3A2327]/75 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#3A2327] px-5 py-2.5 text-sm font-semibold text-[#FAF6F0] transition hover:bg-[#3A2327]/90 active:translate-y-px"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
