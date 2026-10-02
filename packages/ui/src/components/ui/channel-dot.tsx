import type { ChannelColor } from "@sphynx/schema/domain/channels";
import { CHANNEL_SWATCHES } from "@sphynx/ui/lib/channel-colors";
import { cn } from "@sphynx/ui/lib/utils";

interface ChannelDotProps {
  readonly color?: ChannelColor;
  readonly className?: string;
}

export function ChannelDot({ color, className }: ChannelDotProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "skeleton:skeleton-block size-1.5 shrink-0 rounded-full",
        color ? CHANNEL_SWATCHES[color] : "bg-transparent",
        className
      )}
    />
  );
}
