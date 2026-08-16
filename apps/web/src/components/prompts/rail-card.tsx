import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";

interface RailCardProps {
  readonly action?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
  readonly title: string;
}

export function RailCard({
  action,
  children,
  className,
  title,
}: RailCardProps) {
  return (
    <section className="rounded-xl border border-border-surface bg-card shadow-raised">
      <header className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-1.5">
        <h2 className="font-medium text-muted-foreground text-xs">{title}</h2>
        {action}
      </header>
      <div className={cn("px-3 pb-3", className)}>{children}</div>
    </section>
  );
}
