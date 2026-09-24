import { PageHeading } from "@anpord/ui/components/ui/page-heading";
import { Surface } from "@anpord/ui/components/ui/surface";
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
    <div className="w-full max-w-sm text-left">
      <Surface className="p-7">
        <div className="flex items-center">
          <h1>
            <PageHeading title={title} />
          </h1>
          {badge === undefined ? null : (
            <span className="ml-auto">{badge}</span>
          )}
        </div>

        <p className="mt-2 text-muted-foreground text-sm">{description}</p>
        {children}
      </Surface>
    </div>
  );
}
