import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";

interface CardHeaderProps {
  readonly action?: ReactNode;
  readonly className?: string;
  /** Sticks against the rail while the card scrolls past it. */
  readonly sticky?: boolean;
  /** Absent when the card names itself some other way, so nothing renders. */
  readonly title?: ReactNode;
}

/**
 * The bar that titles a card. Shared so the rail and the editing surface name
 * themselves the same way rather than drifting apart a shade at a time.
 */
export function CardHeader({
  action,
  className,
  sticky,
  title,
}: CardHeaderProps) {
  if (!title) {
    return null;
  }

  return (
    <header
      className={cn(
        "flex items-center justify-between gap-2 border-border-surface border-b bg-[color-mix(in_oklab,var(--sidebar-accent)_50%,var(--background))] px-3.5 py-1.5",
        sticky && "sticky top-0 z-10",
        className
      )}
    >
      <h2 className="truncate font-heading text-sm tracking-[-0.015em]">
        {title}
      </h2>
      {action}
    </header>
  );
}
