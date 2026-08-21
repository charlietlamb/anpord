import type { PromptActivityEntry } from "@anpord/schema/domain/prompt-activity";
import { VersionMove } from "@/components/deployments/version-move";
import { VersionLabel } from "@/components/prompts/version-label";

interface ActivitySentenceProps {
  readonly entry: PromptActivityEntry;
}

/**
 * What the actor did, given that the row has already named them. Exhaustive
 * over the union, so a kind added to the contract fails to compile here rather
 * than rendering as whichever branch happens to fall through.
 */
export function ActivitySentence({ entry }: ActivitySentenceProps) {
  switch (entry._tag) {
    case "saved":
      return (
        <>
          <span className="shrink-0">saved</span>
          <VersionLabel version={entry.version} />
          {entry.message ? (
            <span className="min-w-0 truncate">— {entry.message}</span>
          ) : null}
        </>
      );

    case "overwrote":
      return (
        <>
          <span className="shrink-0">overwrote</span>
          <VersionLabel version={entry.version} />
        </>
      );

    case "deployed":
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

    default:
      return assertNever(entry);
  }
}

const assertNever = (entry: never): never => {
  throw new Error(`unhandled activity entry: ${JSON.stringify(entry)}`);
};
