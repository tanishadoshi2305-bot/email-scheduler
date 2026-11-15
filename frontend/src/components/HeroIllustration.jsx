import BrandStamp from "./BrandStamp";
import StarburstIcon from "./StarburstIcon";

/**
 * Custom layered editorial envelope & stacked scheduled-letter illustration
 * crafted with CSS/SVG in #B8CEDD, #3A2327, #E6A8BF, and #FAF6F0.
 */
export default function HeroIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-[430px] pt-8 pb-4 px-2 select-none">
      {/* Stacked scheduled letters peeking out of the envelope */}
      <div className="relative mx-auto w-[90%] h-[230px] sm:h-[250px]">
        {/* Back-most Dusty Rose letter sheet */}
        <div className="absolute -top-6 left-1 right-7 h-44 rounded-t-xl bg-[#E6A8BF] border-[1.5px] border-[#3A2327] -rotate-2 px-4 pt-3 shadow-sm">
          <div className="flex items-center justify-between text-[#3A2327]">
            <span className="font-display text-xs sm:text-sm font-semibold tracking-wide uppercase">
              Bulk Campaign · Batch #04
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-widest opacity-80">
              Staggered
            </span>
          </div>
          <div className="mt-2 h-px bg-[#3A2327]/35" />
        </div>

        {/* Middle Bordeaux Plum letter sheet */}
        <div className="absolute -top-1 left-5 right-3 h-44 rounded-t-xl bg-[#3A2327] border-[1.5px] border-[#3A2327] rotate-1 px-4 pt-3">
          <div className="flex items-center justify-between text-[#FAF6F0]">
            <span className="font-display text-sm sm:text-base tracking-wide uppercase">
              Timed Delivery Queue
            </span>
            <StarburstIcon className="w-5 h-5 text-[#B8CEDD]" title="" />
          </div>
          <div className="mt-2 h-px bg-[#FAF6F0]/25" />
        </div>

        {/* Front Warm Cream stationery sheet */}
        <div className="absolute top-5 left-3 right-5 h-44 rounded-t-xl bg-[#FAF6F0] border-[1.5px] border-[#3A2327] px-5 pt-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-display text-base sm:text-lg font-semibold leading-tight tracking-tight text-[#3A2327] uppercase">
                Scheduled
                <br />
                Dispatch
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <StarburstIcon className="w-7 h-7 text-[#3A2327]" title="" />
              <span className="text-[10px] font-semibold tracking-wider text-[#3A2327]/80">
                By Dispatch
              </span>
            </div>
          </div>

          {/* Ruled stationery lines */}
          <div className="mt-3 space-y-2.5">
            <div className="h-px bg-[#3A2327]/30" />
            <div className="h-px bg-[#3A2327]/30" />
            <div className="h-px bg-[#3A2327]/30 w-4/5" />
          </div>
        </div>

        {/* Mini tucked postage / queue slip accents on left edge */}
        <div className="absolute left-0 bottom-[76px] z-20 -rotate-6 rounded-md bg-[#FAF6F0] border-[1.5px] border-[#3A2327] px-2.5 py-2 shadow-editorialSm">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-[#3A2327]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#3A2327]">
              14:30 UTC
            </span>
          </div>
          <div className="mt-1 h-1 w-12 rounded bg-[#B8CEDD]" />
        </div>

        <div className="absolute left-[74px] bottom-[84px] z-20 rotate-3 rounded-md bg-[#FAF6F0] border-[1.5px] border-[#3A2327] px-2.5 py-1.5 shadow-editorialSm">
          <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#3A2327]">
            On Time
          </span>
        </div>

        {/* Powder Slate Blue envelope pocket with signature semicircular thumb notch */}
        <div className="absolute inset-x-0 bottom-0 z-30 h-[126px] sm:h-[136px]">
          <svg
            viewBox="0 0 400 140"
            className="w-full h-full drop-shadow-[0_2px_0_rgba(58,35,39,0.95)]"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M 10 0 L 160 0 A 40 36 0 0 0 240 0 L 390 0 Q 400 0 400 10 L 400 130 Q 400 140 390 140 L 10 140 Q 0 140 0 130 L 0 10 Q 0 0 10 0 Z"
              fill="#B8CEDD"
              stroke="#3A2327"
              strokeWidth="2.5"
            />
          </svg>

          {/* Subtle postage lines inside envelope pocket */}
          <div className="pointer-events-none absolute left-5 bottom-5 flex flex-col gap-1.5 opacity-60">
            <span className="block w-16 h-0.5 bg-[#3A2327]" />
            <span className="block w-10 h-0.5 bg-[#3A2327]" />
          </div>

          {/* Tilted * OUTBOX stamp badge overlapping bottom-right of envelope */}
          <div className="absolute -right-2 sm:right-2 -top-4 z-40">
            <BrandStamp variant="cream" size="md" tilt="-rotate-[11deg]" />
          </div>
        </div>
      </div>
    </div>
  );
}
