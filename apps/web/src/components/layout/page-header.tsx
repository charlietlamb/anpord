import { PageHeading } from "@anpord/ui/components/ui/page-heading";
import type { ReactNode } from "react";

export function PageHeader({
  actions,
  description,
  title,
}: {
  readonly actions?: ReactNode;
  readonly description?: ReactNode;
  readonly title: string;
}) {
  return (
    <header className="flex flex-col gap-1.5">
      <div className="flex min-h-9 items-center gap-3">
        <h1 className="min-w-0">
          <PageHeading title={title} />
        </h1>
        {actions ? (
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
      {description ? (
        <div className="text-muted-foreground text-sm">{description}</div>
      ) : null}
    </header>
  );
}
