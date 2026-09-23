import { PageHeading } from "@anpord/ui/components/ui/page-heading";
import type { ReactNode } from "react";

export function PageSection({
  actions,
  children,
  title,
}: {
  readonly actions?: ReactNode;
  readonly children: ReactNode;
  readonly title: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <header className="flex min-h-8 items-center gap-3">
        <h2>
          <PageHeading size="section" title={title} />
        </h2>
        {actions === undefined ? null : (
          <div className="ml-auto flex items-center gap-2">{actions}</div>
        )}
      </header>
      {children}
    </section>
  );
}
