import StarburstIcon from "./StarburstIcon";

/**
 * Reusable Outbox oval stamp featuring an 8-point starburst inside a
 * double-bordered oval pill (#FAF6F0 cream and #3A2327 plum variants).
 */
export default function BrandStamp({
  variant = "cream",
  size = "md",
  tilt = "-rotate-3",
  className = "",
}) {
  const isPlum = variant === "plum" || variant === "dark";

  const surfaceStyles = isPlum
    ? "bg-[#3A2327] text-[#FAF6F0] border-[#3A2327]"
    : "bg-[#FAF6F0] text-[#3A2327] border-[#3A2327]";

  const innerRingStyles = isPlum ? "border-[#FAF6F0]/85" : "border-[#3A2327]";

  const sizeStyles = {
    sm: {
      outer: "px-3.5 py-1.5 border-[1.5px]",
      inner: "inset-[2.5px] border",
      icon: "w-3 h-3",
      text: "text-[11px] tracking-[0.16em]",
      gap: "gap-1.5",
    },
    md: {
      outer: "px-5 py-2 border-[1.5px]",
      inner: "inset-[3px] border",
      icon: "w-4 h-4",
      text: "text-xs sm:text-sm tracking-[0.18em]",
      gap: "gap-2",
    },
    lg: {
      outer: "px-6 py-2.5 border-2",
      inner: "inset-[3.5px] border-[1.25px]",
      icon: "w-5 h-5",
      text: "text-sm sm:text-base tracking-[0.2em]",
      gap: "gap-2.5",
    },
  }[size] || {
    outer: "px-5 py-2 border-[1.5px]",
    inner: "inset-[3px] border",
    icon: "w-4 h-4",
    text: "text-xs sm:text-sm tracking-[0.18em]",
    gap: "gap-2",
  };

  return (
    <span
      className={`relative inline-flex items-center justify-center rounded-[999px] select-none ${surfaceStyles} ${sizeStyles.outer} ${tilt} ${className}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute rounded-[999px] ${sizeStyles.inner} ${innerRingStyles}`}
      />
      <span className={`relative z-10 inline-flex items-center ${sizeStyles.gap}`}>
        <StarburstIcon className={sizeStyles.icon} title="" />
        <span className={`font-display font-semibold uppercase leading-none ${sizeStyles.text}`}>
          DISPATCH
        </span>
      </span>
    </span>
  );
}
