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
    <section className="shrink-0 overflow-hidden rounded-xl border border-border-surface bg-sidebar-accent/40 shadow-raised">
      <header className="flex items-center justify-between gap-2 border-border-surface border-b bg-sidebar-accent/50 px-3.5 py-2">
        <h2 className="font-heading text-[0.9375rem] tracking-[-0.015em]">
          {title}
        </h2>
        {action}
      </header>
      <div className={cn("px-3.5 py-3", className)}>{children}</div>
    </section>
  );
}
