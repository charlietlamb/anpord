import {
  PAGE_FRAME,
  PAGE_WIDTHS,
  type PageWidth,
} from "@anpord/ui/lib/page-frame";
import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/page-header";

export function PageShell({
  actions,
  children,
  description,
  tabs,
  title,
  width = "prose",
}: {
  readonly actions?: ReactNode;
  readonly children: ReactNode;
  readonly description?: ReactNode;
  readonly tabs?: ReactNode;
  readonly title: string;
  readonly width?: PageWidth;
}) {
  return (
    <div className={PAGE_FRAME}>
      <div
        className={cn(
          PAGE_WIDTHS[width],
          "flex flex-1 flex-col gap-5 pt-4 pb-8"
        )}
      >
        <PageHeader actions={actions} description={description} title={title} />
        {tabs}
        {children}
      </div>
    </div>
  );
}
