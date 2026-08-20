import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@anpord/ui/components/tooltip";
import type { ReactNode } from "react";

interface DetailRowFrameProps {
  readonly children: ReactNode;
  readonly label: string;
  /** What occupies the icon column — an icon for most rows, but a face where
   * the value is a person and the avatar already names the field. */
  readonly marker: ReactNode;
}

/**
 * One property of the prompt: a marker, then the value. The marker names the
 * field, so the column reads down a single edge rather than splitting each row
 * between a label on the left and a value pushed to the right.
 *
 * A marker that replaces a label has to be able to say what it stands for, so
 * pointing at the row names the field.
 */
export function DetailRowFrame({
  children,
  label,
  marker,
}: DetailRowFrameProps) {
  return (
    <div className="flex h-7 items-center gap-2 text-label">
      {/* Only the marker triggers the tooltip: the value beside it may be a
          control of its own, and wrapping that in a trigger would put one
          interactive element inside another. */}
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
