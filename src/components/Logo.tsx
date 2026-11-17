import { Link } from "react-router-dom";

/** Vector recreation of the cafe's cup logo mark. */
export function CupMark({ className = "", strokeWidth = 1.6 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M5 9.25h12v6.1A4.65 4.65 0 0 1 12.35 20h-2.7A4.65 4.65 0 0 1 5 15.35v-6.1Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <path
        d="M17 10.7h1.35a2.85 2.85 0 0 1 0 5.7H17"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M9.6 13.5a1.9 1.9 0 1 1 1.9 1.9"
        stroke="currentColor"
        strokeWidth={strokeWidth * 0.85}
        strokeLinecap="round"
      />
      <path d="M4.6 21.6h14.8" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <path
        d="M9.4 6.7c0-1.15 1-1.5 1-2.6M12.6 6.9c0-1.4 1.15-1.75 1.15-3"
        stroke="currentColor"
        strokeWidth={strokeWidth * 0.85}
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Logo({
  compact = false,
  light = false,
  className = "",
}: {
  compact?: boolean;
  light?: boolean;
  className?: string;
}) {
  return (
    <Link to="/" className={`group flex items-center gap-2.5 ${className}`} aria-label="Café 90's home">
      <CupMark
        className={`h-9 w-9 shrink-0 transition-transform duration-300 group-hover:-rotate-6 sm:h-10 sm:w-10 ${
          light ? "text-amber" : "text-chili"
        }`}
      />
      <span className="flex flex-col leading-none">
        <span className="flex items-baseline gap-1.5">
          <span className={`script text-[1.28rem] sm:text-[1.4rem] ${light ? "text-amber" : "text-chili"}`}>
            Café
          </span>
          <span className={`display text-[1.3rem] sm:text-[1.45rem] ${light ? "text-cream" : "text-ink"}`}>
            90&apos;s
          </span>
        </span>
        {!compact && (
          <span
            className={`mt-1 text-[0.44rem] font-bold uppercase tracking-[0.34em] sm:text-[0.5rem] ${
              light ? "text-cream/45" : "text-ink/45"
            }`}
          >
            Vibe with taste
          </span>
        )}
      </span>
    </Link>
  );
}
