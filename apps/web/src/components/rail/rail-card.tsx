import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";
import { CardHeader } from "@/components/rail/card-header";

interface RailCardProps {
  readonly action?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
  readonly title: string;
}

/** `overflow-clip` rounds the header and rows to the card's corners without
 * establishing a scroll container, which the page above it owns. */
export function RailCard({
  action,
  children,
  className,
  title,
}: RailCardProps) {
  return (
    <section className="shrink-0 overflow-clip rounded-xl border border-border-surface bg-sidebar-accent shadow-raised transition-surface">
      <CardHeader action={action} title={title} />
      <div className={cn("px-3.5 py-3", className)}>{children}</div>
    </section>
  );
}
