import {
  PAGE_FRAME,
  PAGE_WIDTHS,
  type PageWidth,
} from "@anpord/ui/lib/page-frame";
import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";

interface PageShellProps {
  /** What acts on the page. Sits in a bar of its own, ruled off from the
   * content below so it reads as the page's chrome rather than as the first
   * item of the list. */
  readonly actions?: ReactNode;
  readonly children: ReactNode;
  /** Said once, above the content, where a page needs explaining. */
  readonly description?: ReactNode;
  readonly width?: PageWidth;
}

/**
 * The frame every page sits in.
 *
 * There is no title: the breadcrumb above already names where you are, and a
 * heading repeating it spends the top of the screen restating what the reader
 * just read. What the page can do goes there instead.
 */
export function PageShell({
  actions,
  children,
  description,
  width = "wide",
}: PageShellProps) {
  return (
    <div className={PAGE_FRAME}>
      {actions ? (
        <div className="shrink-0 border-border-faint border-b">
          <div
            className={cn(
              PAGE_WIDTHS[width],
              "flex h-11 items-center justify-end gap-2"
            )}
          >
            {actions}
          </div>
        </div>
      ) : null}

      <div className={cn(PAGE_WIDTHS[width], "pt-6 pb-24")}>
        {description ? (
          <p className="mb-6 max-w-prose text-muted-foreground text-sm">
            {description}
          </p>
        ) : null}
        {children}
      </div>
    </div>
  );
}
