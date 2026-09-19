import {
  PAGE_FRAME,
  PAGE_WIDTHS,
  type PageWidth,
} from "@anpord/ui/lib/page-frame";
import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";

interface PageShellProps {
  readonly actions?: ReactNode;
  readonly children: ReactNode;
  readonly description?: ReactNode;
  readonly leading?: ReactNode;
  readonly width?: PageWidth;
}

export function PageShell({
  actions,
  children,
  description,
  leading,
  width = "prose",
}: PageShellProps) {
  const hasBar = Boolean(actions || leading);

  return (
    <div className={PAGE_FRAME}>
      {hasBar ? (
        <div className="sticky top-0 z-10 shrink-0 bg-background">
          <div
            className={cn(PAGE_WIDTHS[width], "flex h-11 items-center gap-2")}
          >
            {leading}
            <div className="ml-auto flex shrink-0 items-center gap-2">
              {actions}
            </div>
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          PAGE_WIDTHS[width],
          "flex min-h-0 flex-1 flex-col pb-24",
          !hasBar && "pt-6"
        )}
      >
        {description ? (
          <p className="mb-5 max-w-prose text-muted-foreground text-sm">
            {description}
          </p>
        ) : null}
        {children}
      </div>
    </div>
  );
}
