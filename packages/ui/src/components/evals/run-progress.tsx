import type { EvalRun } from "@anpord/schema/domain/evals";
import { counted } from "@anpord/ui/lib/evals/counted";
import { cn } from "@anpord/ui/lib/utils";

const TONE = {
  failed: "bg-destructive",
  passed: "bg-success",
  queued: "bg-alpha-8",
  running: "bg-primary",
  void: "bg-warning",
} as const;

const settledOf = (run: EvalRun) =>
  run.trials.filter(
    (trial) => trial.status !== "queued" && trial.status !== "running"
  ).length;

const activeOf = (run: EvalRun) =>
  run.trials.find((trial) => trial.status === "running");

export function RunProgress({ run }: { readonly run: EvalRun }) {
  const active = activeOf(run);
  const settled = settledOf(run);

  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="flex shrink-0 items-center gap-0.5">
        {run.trials.map((trial) => (
          <span
            className={cn(
              "h-1.5 w-4 rounded-full transition-colors duration-300",
              TONE[trial.status],
              trial.status === "running" &&
                "animate-pulse motion-reduce:animate-none"
            )}
            key={trial.id}
          />
        ))}
      </span>

      <span className="truncate text-muted-foreground text-xs">
        {active === undefined
          ? `${settled} of ${counted(run.trials.length, "trial", "trials")}`
          : `${counted(active.commands, "command", "commands")}, ${counted(active.filesChanged.length, "file", "files")}`}
      </span>
    </span>
  );
}
