import { type ChannelColor, CHANNEL_SWATCHES } from "@anpord/ui/lib/channel-colors";
import { cn } from "@anpord/ui/lib/utils";

interface ChannelDotProps {
  /** Absent when nothing serves this row, which still occupies the column so
   * the numbers beside it stay in line. */
  readonly color?: ChannelColor;
  readonly className?: string;
}

/** The smallest a channel can be stated. A row that names its channel in a
 * badge spends a third of its width on it; a dot spends six pixels. */
export function ChannelDot({ color, className }: ChannelDotProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "size-1.5 shrink-0 rounded-full",
        color ? CHANNEL_SWATCHES[color] : "bg-transparent",
        className
      )}
    />
  );
}
