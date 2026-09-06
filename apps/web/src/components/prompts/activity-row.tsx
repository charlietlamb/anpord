import type { PromptActivityEntry } from "@anpord/schema/domain/prompt-activity";
import { ActivityMarker } from "@/components/prompts/activity-marker";
import { ActivitySentence } from "@/components/prompts/activity-sentence";
import { useRelativeTime } from "@/lib/use-relative-time";

interface ActivityRowProps {
  readonly entry: PromptActivityEntry;
}

export function ActivityRow({ entry }: ActivityRowProps) {
  const when = useRelativeTime(entry.at);

  return (
    <li className="relative flex items-center gap-3 py-1">
      <ActivityMarker entry={entry} />

      <span className="flex min-w-0 flex-1 items-center gap-x-1.5 text-label text-muted-foreground">
        <span className="shrink-0 text-foreground">
          {entry.actor?.name ?? "Someone"}
        </span>

        <ActivitySentence entry={entry} />

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
