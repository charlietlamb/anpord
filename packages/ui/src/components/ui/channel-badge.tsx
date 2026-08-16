import { Badge } from "./badge";
import {
  CHANNEL_DEFAULT_COLOR,
  CHANNEL_TONES,
  type ChannelColor,
} from "../../lib/channel-colors";
import { cn } from "../../lib/utils";

interface ChannelBadgeProps {
  readonly className?: string;
  /** Falls back to the neutral tone so a channel renders before its colour
   * has loaded rather than flickering from grey to its own. */
  readonly color?: ChannelColor;
  readonly name: string;
  readonly size?: "xs" | "sm";
  /** Shown alongside the name where the placement matters, as in a rail. */
  readonly version?: number;
}

export function ChannelBadge({
  className,
  color = CHANNEL_DEFAULT_COLOR,
  name,
  size = "sm",
  version,
}: ChannelBadgeProps) {
  return (
    <Badge
      className={cn(CHANNEL_TONES[color], className)}
      size={size}
      variant="secondary"
    >
      <span className="size-1.5 shrink-0 rounded-full bg-current" />
      {name}
      {version === undefined ? null : (
        <span className="tabular-nums opacity-70">v{version}</span>
      )}
    </Badge>
  );
}
