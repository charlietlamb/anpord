import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";
import { CardHeader } from "@/components/prompts/card-header";

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
      <CardHeader action={action} sticky title={title} />
      <div className={cn("px-3.5 py-3", className)}>{children}</div>
    </section>
  );
}
