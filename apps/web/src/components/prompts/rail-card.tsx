import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";

interface RailCardProps {
  readonly action?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
  readonly title: string;
}

/** `overflow-clip` rather than `overflow-hidden`: both round the card's
 * children to its corners, but only `hidden` establishes a scroll container,
 * which would trap the sticky header inside the card instead of letting it
 * stick against the rail. */
export function RailCard({
  action,
  children,
  className,
  title,
}: RailCardProps) {
  return (
    <section className="shrink-0 overflow-clip rounded-xl border border-border-surface bg-sidebar-accent/50 shadow-raised">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-border-surface border-b bg-[color-mix(in_oklab,var(--sidebar-accent)_50%,var(--background))] px-3.5 py-1.5">
        <h2 className="font-heading text-sm tracking-[-0.015em]">{title}</h2>
        {action}
      </header>
      <div className={cn("px-3.5 py-3", className)}>{children}</div>
    </section>
  );
}
