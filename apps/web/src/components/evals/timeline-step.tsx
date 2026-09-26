import { commandText } from "@anpord/schema/domain/eval-journal";
import { Badge } from "@anpord/ui/components/ui/badge";
import { elapsed, seconds } from "@anpord/ui/lib/evals/duration";
import { cn } from "@anpord/ui/lib/utils";
import { ExitCode } from "@/components/evals/exit-code";
import { VerbBadge } from "@/components/evals/verb-badge";
import type { TimelineStep as Step } from "@/lib/evals/timeline-sections";

const CHIPPED = new Set(["read", "wrote"]);

export function TimelineStep({
  onSelect,
  selected,
  step,
}: {
  readonly onSelect: () => void;
  readonly selected: boolean;
  readonly step: Step;
}) {
  const { entry } = step;
  const { target, title, verb } = step.title;

  return (
    <button
      aria-pressed={selected}
      className={cn(
        "flex min-h-12 w-full items-center gap-3 py-2.5 pr-4 pl-[42px] text-left outline-none transition-colors hover:bg-alpha-4 focus-visible:bg-alpha-4",
        selected && "bg-alpha-4"
      )}
      onClick={onSelect}
      type="button"
    >
      <span className="w-24 shrink-0">
        <VerbBadge failed={step.failed} verb={verb} />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-foreground text-sm">{title}</span>
          {entry._tag === "command" ? <ExitCode code={entry.exitCode} /> : null}
        </span>
        {entry._tag === "command" ? (
          <span className="truncate font-mono text-muted-foreground/70 text-xs">
            {commandText(entry.command)}
          </span>
        ) : null}
      </span>

      {target !== null && CHIPPED.has(verb) ? (
        <Badge
          className="min-w-0 max-w-56 shrink font-mono text-[11.5px]"
          size="xs"
          variant="quiet"
        >
          <span className="truncate">{target}</span>
        </Badge>
      ) : null}

      <span className="w-16 shrink-0 text-right text-muted-foreground text-xs tabular-nums">
        {describeTook(step)}
      </span>
      <span className="w-9 shrink-0 text-right text-muted-foreground/70 text-xs tabular-nums">
        {step.offsetMs === null ? "" : elapsed(step.offsetMs)}
      </span>
    </button>
  );
}

const describeTook = ({ durationMs, entry }: Step) => {
  if (durationMs !== null) {
    return seconds(durationMs);
  }

  const inFlight =
    (entry._tag === "command" || entry._tag === "toolCall") &&
    entry.startedAtMillis !== null &&
    entry.startedAtMillis !== undefined &&
    entry.finishedAtMillis === null;

  return inFlight ? "Running" : "";
};
