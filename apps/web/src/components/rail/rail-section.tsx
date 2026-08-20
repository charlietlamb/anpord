import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";
import { SectionLabel } from "@/components/rail/section-label";

interface RailSectionProps {
  readonly action?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
  readonly title: string;
}

/**
 * A region of the rail. It draws no box: the label above and the space either
 * side are what separate it from its neighbours, so the rail reads as one
 * column of content rather than a stack of competing panels.
 */
export function RailSection({
  action,
  children,
  className,
  title,
}: RailSectionProps) {
  return (
    <section className="flex shrink-0 flex-col gap-1.5">
      <SectionLabel action={action}>{title}</SectionLabel>
      <div className={cn(className)}>{children}</div>
    </section>
  );
}
