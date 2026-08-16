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
    <section className="shrink-0 overflow-hidden rounded-xl border border-border-surface bg-sidebar-accent/50 shadow-raised">
      <header className="flex items-center justify-between gap-2 border-border-surface border-b px-3.5 py-1.5">
        <h2 className="font-heading text-sm tracking-[-0.015em]">{title}</h2>
        {action}
      </header>
      <div className={cn("px-3.5 py-3", className)}>{children}</div>
    </section>
  );
}
