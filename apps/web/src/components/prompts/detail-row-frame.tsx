import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@anpord/ui/components/tooltip";
import type { ReactNode } from "react";

interface DetailRowFrameProps {
  readonly children: ReactNode;
  readonly label: string;
  readonly marker: ReactNode;
}

export function DetailRowFrame({
  children,
  label,
  marker,
}: DetailRowFrameProps) {
  return (
    <div className="group/detail flex h-7 items-center gap-2 text-label text-muted-foreground transition-colors hover:text-foreground">
      {/* Only the marker triggers: wrapping the value would nest an interactive element inside another. */}
      <Tooltip>
        <TooltipTrigger
          render={<span className="flex shrink-0 cursor-default" />}
        >
          {marker}
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>

      <span className="sr-only">{label}</span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </div>
  );
}
