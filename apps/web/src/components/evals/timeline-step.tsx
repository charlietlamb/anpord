import { commandText } from "@anpord/schema/domain/eval-journal";
import { elapsed, seconds } from "@anpord/ui/lib/evals/duration";
import { cn } from "@anpord/ui/lib/utils";
import { ExitCode } from "@/components/evals/exit-code";
import { VerbBadge } from "@/components/evals/verb-badge";
import {
  isInFlight,
  type TimelineStep as Step,
} from "@/lib/evals/timeline-sections";

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

  return (
    <button
      aria-pressed={selected}
      className={cn(
        "flex h-8 w-full items-center gap-2.5 pr-3.5 pl-[34px] text-left outline-none transition-colors hover:bg-alpha-4 focus-visible:bg-alpha-4",
        selected && "bg-alpha-4"
      )}
      onClick={onSelect}
      type="button"
    >
      <span className="w-[84px] shrink-0">
        <VerbBadge failed={step.failed} verb={step.title.verb} />
      </span>
      <span className="shrink-0 truncate text-[13px] text-foreground">
        {step.title.title}
      </span>
      {entry._tag === "command" ? <ExitCode code={entry.exitCode} /> : null}
      <span className="min-w-0 flex-1 truncate font-mono text-muted-foreground/60 text-xs">
        {entry._tag === "command" ? commandText(entry.command) : ""}
      </span>
      <span className="w-12 shrink-0 text-right text-muted-foreground text-xs tabular-nums">
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

  return isInFlight(entry) ? "Running" : "";
};
