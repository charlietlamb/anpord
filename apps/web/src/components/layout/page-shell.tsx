import {
  PAGE_FRAME,
  PAGE_WIDTHS,
  type PageWidth,
} from "@anpord/ui/lib/page-frame";
import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";

interface PageShellProps {
  /** What acts on the page, floated at its top right where the editor keeps
   * the same controls. */
  readonly actions?: ReactNode;
  readonly children: ReactNode;
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
  width = "wide",
}: PageShellProps) {
  return (
    <div className={PAGE_FRAME}>
      {actions ? (
        <div
          className={cn(
            PAGE_WIDTHS[width],
            "flex shrink-0 items-center justify-end gap-2 pt-3"
          )}
        >
          {actions}
        </div>
      ) : null}

      <div className={cn(PAGE_WIDTHS[width], "pt-5 pb-24", actions && "pt-2")}>
        {children}
      </div>
    </div>
  );
}
