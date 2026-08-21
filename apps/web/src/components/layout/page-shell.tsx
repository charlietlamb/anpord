import {
  PAGE_FRAME,
  PAGE_WIDTHS,
  type PageWidth,
} from "@anpord/ui/lib/page-frame";
import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";

interface PageShellProps {
  /** What acts on the page, at the right of its bar. */
  readonly actions?: ReactNode;
  readonly children: ReactNode;
  /** Said once, above the content, where a page needs explaining. */
  readonly description?: ReactNode;
  /** What names the page, at the left of its bar, where reading starts. */
  readonly leading?: ReactNode;
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
  leading,
  width = "prose",
}: PageShellProps) {
  return (
    <div className={PAGE_FRAME}>
      {actions || leading ? (
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

      {/* Grown rather than sized: a list runs past the fold and scrolls, while
          a page with nothing on it has an emptiness to centre in. */}
      <div
        className={cn(PAGE_WIDTHS[width], "flex min-h-0 flex-1 flex-col pb-24")}
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
