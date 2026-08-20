import { CHANNEL_SWATCHES } from "@anpord/ui/lib/channel-colors";
import { initials } from "@anpord/ui/lib/initials";
import { cn } from "@anpord/ui/lib/utils";
import { IdentityAvatar } from "@/components/dashboard/sidebar-identity";
import type { ActivityEntry } from "@/lib/prompt-activity";
import { useChannelColor } from "@/lib/query/use-channel-colors";

interface ActivityMarkerProps {
  readonly entry: ActivityEntry;
}

/**
 * What sits in the timeline's column, at one size for every kind of entry.
 *
 * A six-pixel dot beside a twenty-pixel face gave the thread two centres and
 * made it zigzag. Both fill the same slot now: whoever acted, at that size, or
 * a dot held in a ring of the same diameter where nobody is recorded. The ring
 * is opaque so the line behind it is broken by every marker rather than only
 * by the ones that happen to be solid.
 */
export function ActivityMarker({ entry }: ActivityMarkerProps) {
  const channelColor = useChannelColor();

  if (entry.actor) {
    return (
      <IdentityAvatar
        className="size-5 shrink-0 ring-2 ring-background"
        fallbackClassName="text-[0.5rem]"
        image={entry.actor.image}
        label={entry.actor.name}
        text={initials(entry.actor.name)}
      />
    );
  }

  return (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-background">
      <span
        aria-hidden="true"
        className={cn(
          "size-2 rounded-full",
          entry.kind === "deployed"
            ? CHANNEL_SWATCHES[channelColor(entry.channel)]
            : "bg-muted-foreground/40"
        )}
      />
    </span>
  );
}
