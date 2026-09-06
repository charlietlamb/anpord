import type { PromptActivityEntry } from "@anpord/schema/domain/prompt-activity";
import { CHANNEL_SWATCHES } from "@anpord/ui/lib/channel-colors";
import { initials } from "@anpord/ui/lib/initials";
import { cn } from "@anpord/ui/lib/utils";
import { IdentityAvatar } from "@/components/dashboard/sidebar-identity";
import { useChannelColor } from "@/lib/query/use-channel-colors";

interface ActivityMarkerProps {
  readonly entry: PromptActivityEntry;
}

/* Every marker fills the same size-5 slot, or the timeline thread zigzags. */
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
          entry._tag === "deployed"
            ? CHANNEL_SWATCHES[channelColor(entry.channel)]
            : "bg-muted-foreground/40"
        )}
      />
    </span>
  );
}
