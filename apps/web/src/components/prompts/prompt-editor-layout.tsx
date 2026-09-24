import { PAGE_FRAME, PAGE_WIDTHS } from "@anpord/ui/lib/page-frame";
import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";

export function PromptEditorLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  return (
    <div className={cn(PAGE_FRAME, "relative")}>
      <div
        className={cn(
          PAGE_WIDTHS.wide,
          "grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] xl:gap-10"
        )}
      >
        {children}
      </div>
    </div>
  );
}
