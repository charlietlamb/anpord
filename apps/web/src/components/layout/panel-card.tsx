import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";

export function PanelCard({
  badge,
  children,
  description,
  heading = "h2",
  mark,
  title,
}: {
  /** Sits after the title, for what qualifies the panel rather than names it. */
  readonly badge?: ReactNode;
  readonly children?: ReactNode;
  readonly description: ReactNode;
  readonly heading?: "h1" | "h2";
  readonly mark?: ReactNode;
  readonly title: string;
}) {
  const Heading = heading;

  return (
    <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 text-left">
      <div className={cn("flex items-center", mark === undefined || "gap-2")}>
        {mark}
        <Heading className="font-heading text-xl tracking-tight">
          {title}
        </Heading>
        {badge === undefined ? null : <span className="ml-auto">{badge}</span>}
      </div>

      <p className="mt-2 text-muted-foreground text-sm">{description}</p>
      {children}
    </div>
  );
}
