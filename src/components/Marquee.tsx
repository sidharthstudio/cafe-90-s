import type { ReactNode } from "react";

export default function Marquee({
  children,
  reverse = false,
  className = "",
}: {
  children: ReactNode;
  reverse?: boolean;
  className?: string;
}) {
  return (
    <div className={`marquee overflow-hidden ${className}`}>
      <div className={`marquee-track ${reverse ? "reverse" : ""}`}>
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
