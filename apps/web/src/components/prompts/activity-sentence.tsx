import { VersionMove } from "@/components/deployments/version-move";
import type { ActivityEntry } from "@/lib/prompt-activity";

interface ActivitySentenceProps {
  readonly entry: ActivityEntry;
}

/** What the actor did, given that the row has already named them. */
export function ActivitySentence({ entry }: ActivitySentenceProps) {
  if (entry.kind === "deployed") {
    return (
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
    );
  }

  if (entry.kind === "overwrote") {
    return (
      <>
        <span className="shrink-0">overwrote</span>
        <span className="shrink-0 text-foreground tabular-nums">
          {entry.version === null ? "a version" : `v${entry.version}`}
        </span>
      </>
    );
  }

  return (
    <>
      <span className="shrink-0">saved</span>
      <span className="shrink-0 text-foreground tabular-nums">
        v{entry.version}
      </span>
      {entry.message ? (
        <span className="min-w-0 truncate">— {entry.message}</span>
      ) : null}
    </>
  );
}
