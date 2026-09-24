import { PageHeading } from "@anpord/ui/components/ui/page-heading";
import type { ReactNode } from "react";

export function PanelCard({
  badge,
  children,
  description,
  title,
}: {
  readonly badge?: ReactNode;
  readonly children?: ReactNode;
  readonly description: ReactNode;
  readonly title: string;
}) {
  return (
    <div className="flex w-full max-w-sm flex-col gap-6 text-left">
      <header className="flex flex-col gap-1.5 px-1">
        <div className="flex items-center gap-2">
          <h1 className="flex min-w-0">
            <PageHeading title={title} />
          </h1>
          {badge}
        </div>
        <p className="text-muted-foreground text-sm">{description}</p>
      </header>
      {children}
    </div>
  );
}
