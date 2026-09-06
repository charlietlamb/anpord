import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";

export function PanelCard({
  children,
  description,
  heading = "h2",
  mark,
  title,
}: {
  readonly children?: ReactNode;
  readonly description: ReactNode;
  readonly heading?: "h1" | "h2";
  readonly mark?: ReactNode;
  readonly title: string;
}) {
  const Heading = heading;

  return (
    <div className="panel-card-shadow w-full max-w-sm rounded-[3px] border border-border bg-card p-8 text-left">
      <div className={cn("flex items-center", mark === undefined || "gap-2")}>
        {mark}
        <Heading className="font-heading text-xl tracking-tight">
          {title}
        </Heading>
      </div>

      <p className="mt-2 text-muted-foreground text-sm">{description}</p>
      {children}
    </div>
  );
}
