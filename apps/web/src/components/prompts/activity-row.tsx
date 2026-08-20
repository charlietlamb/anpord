import { VersionMove } from "@/components/deployments/version-move";
import { ActivityMarker } from "@/components/prompts/activity-marker";
import type { ActivityEntry } from "@/lib/prompt-activity";
import { useRelativeTime } from "@/lib/use-relative-time";

interface ActivityRowProps {
  readonly entry: ActivityEntry;
}

/**
 * One thing that happened, on one line, in one grammar: who, then what they
 * did. Both kinds of entry take the same shape, so the feed reads down its
 * left edge rather than asking which sentence pattern this row uses.
 */
export function ActivityRow({ entry }: ActivityRowProps) {
  const when = useRelativeTime(entry.at);

  return (
    <li className="relative flex items-center gap-3 py-1">
      <ActivityMarker entry={entry} />

      <span className="flex min-w-0 flex-1 items-center gap-x-1.5 text-label text-muted-foreground">
        <span className="shrink-0 text-foreground">
          {entry.actor?.name ?? "Someone"}
        </span>

        {entry.kind === "saved" ? (
          <>
            <span className="shrink-0">saved</span>
            <span className="shrink-0 text-foreground tabular-nums">
              v{entry.version}
            </span>
            {entry.message ? (
              <span className="min-w-0 truncate">— {entry.message}</span>
            ) : null}
          </>
        ) : (
          <>
            <span className="shrink-0">pointed</span>
            <span className="shrink-0 text-foreground">{entry.channel}</span>
            <span className="shrink-0">at</span>
            <VersionMove
              className="shrink-0 gap-1 text-label"
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
