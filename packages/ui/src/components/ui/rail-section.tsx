import type { ReactNode } from "react";
import { PageHeading } from "@anpord/ui/components/ui/page-heading";

export function RailSection({
  action,
  children,
  className,
  title,
}: {
  readonly action?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
  readonly title: string;
}) {
  return (
    <section className="flex shrink-0 flex-col gap-1.5">
      <div className="flex h-6 items-center justify-between gap-2">
        <h2 className="min-w-0">
          <PageHeading size="label" title={title} />
        </h2>
        {action}
      </div>
      <div className={className}>{children}</div>
    </section>
  );
}
