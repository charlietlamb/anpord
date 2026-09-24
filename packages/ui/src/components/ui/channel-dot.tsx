import { type ChannelColor, CHANNEL_SWATCHES } from "@anpord/ui/lib/channel-colors";
import { cn } from "@anpord/ui/lib/utils";

interface ChannelDotProps {
  readonly color?: ChannelColor;
  readonly className?: string;
}

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
