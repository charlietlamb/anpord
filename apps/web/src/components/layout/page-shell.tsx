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
  /* Below the bar rather than inside it, spaced as the trial screen spaces
     its own: the bar is a row of chrome, and a control that chooses what the
     page shows belongs with the page. */
  readonly tabs?: ReactNode;
  readonly width?: PageWidth;
}

export function PageShell({
  actions,
  children,
  description,
  leading,
  tabs,
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
          "flex min-h-0 flex-1 flex-col gap-5 pb-24",
          hasBar ? "pt-4" : "pt-6"
        )}
      >
        {description ? (
          <p className="max-w-prose text-muted-foreground text-sm">
            {description}
          </p>
        ) : null}
        {tabs}
        {children}
      </div>
    </div>
  );
}
