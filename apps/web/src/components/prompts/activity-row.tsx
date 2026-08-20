import { ChannelDot } from "@anpord/ui/components/ui/channel-dot";
import { VersionMove } from "@/components/deployments/version-move";
import { SaveMarker } from "@/components/prompts/save-marker";
import type { ActivityEntry } from "@/lib/prompt-activity";
import { useChannelColor } from "@/lib/query/use-channel-colors";
import { useRelativeTime } from "@/lib/use-relative-time";

interface ActivityRowProps {
  readonly entry: ActivityEntry;
}

/**
 * One thing that happened, on one line. The marker sits in the timeline's
 * column so the rail behind it reads as a continuous thread rather than a
 * series of unrelated rows.
 */
export function ActivityRow({ entry }: ActivityRowProps) {
  const when = useRelativeTime(entry.at);
  const channelColor = useChannelColor();

  return (
    <li className="relative flex items-start gap-3 py-1.5">
      <span className="z-10 flex size-5 shrink-0 items-center justify-center rounded-full bg-background">
        {entry.kind === "saved" ? (
          <SaveMarker author={entry.author} />
        ) : (
          <ChannelDot color={channelColor(entry.channel)} />
        )}
      </span>

      <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1.5 text-label text-muted-foreground">
        {entry.kind === "saved" ? (
          <>
            <span className="text-foreground">
              {entry.author?.name ?? "Someone"}
            </span>
            <span>saved</span>
            <span className="text-foreground tabular-nums">
              v{entry.version}
            </span>
            {entry.message ? (
              <span className="min-w-0 truncate">— {entry.message}</span>
            ) : null}
          </>
        ) : (
          <>
            <span className="text-foreground">{entry.channel}</span>
            <span>now serves</span>
            <VersionMove
              className="gap-1 text-label"
              from={entry.from}
              to={entry.to}
            />
          </>
        )}

        <time
          className="ml-auto shrink-0 whitespace-nowrap text-xs tabular-nums opacity-60"
          dateTime={entry.at.toISOString()}
        >
          {when}
        </time>
      </span>
    </li>
  );
}
