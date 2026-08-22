import type { EvalRun } from "@anpord/schema/domain/evals";
import { RAIL_FRAME } from "@anpord/ui/lib/rail-frame";
import { cn } from "@anpord/ui/lib/utils";

/* Tighter than the prompt rail: these sections are three facts each rather
   than lists, so the space between them can close without them running
   together. */
const RAIL_GAP = "gap-5";

import { ClockIcon, GridFourIcon, TimerIcon } from "@phosphor-icons/react";
import { RunStatusBadge } from "@/components/evals/eval-status-badge";
import { VariantFacts } from "@/components/evals/variant-facts";
import { RailFact } from "@/components/rail/rail-fact";
import { RailSection } from "@/components/rail/rail-section";

const clock = (millis: number) =>
  new Date(millis).toLocaleString(undefined, {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });

const durationOf = (run: EvalRun) => {
  if (run.finishedAt === null) {
    return null;
  }

  const seconds = Math.round(
    (run.finishedAt.epochMillis - run.startedAt.epochMillis) / 1000
  );

  return seconds < 60 ? `${seconds}s` : `${Math.round(seconds / 60)}m`;
};

/**
 * What the run is, held in view while its cells scroll past.
 *
 * Everything here is constant for the whole run, which is what makes it a rail
 * rather than a row: a reader checks the provider once and reads the results
 * for as long as the list is long.
 */
export function RunRail({ run }: { readonly run: EvalRun }) {
  const took = durationOf(run);

  return (
    <aside className={cn(RAIL_FRAME, RAIL_GAP)}>
      <RailSection title="Run">
        <div className="flex flex-col gap-1">
          <div className="flex h-6 items-center gap-2">
            <RunStatusBadge status={run.status} />
          </div>

          <RailFact
            Icon={ClockIcon}
            label="started"
            value={clock(run.startedAt.epochMillis)}
          />
          {took === null ? null : (
            <RailFact Icon={TimerIcon} label="took" value={took} />
          )}
          <RailFact
            Icon={GridFourIcon}
            label="grid"
            value={`${run.cases.length} × ${run.tasks.length}`}
          />
        </div>
      </RailSection>

      {run.tasks.length === 0 ? null : (
        <RailSection title="Variant">
          <div className="flex flex-col gap-2">
            {run.tasks.map((task) => (
              <VariantFacts
                harness={task.harness}
                harnessVersion={task.harnessVersion}
                key={`${task.harness}-${task.model}-${task.provider}`}
                model={task.model}
                provider={task.provider}
              />
            ))}
          </div>
        </RailSection>
      )}

      {run.failure === null ? null : (
        <RailSection title="Why it ended">
          <p className="text-pretty text-muted-foreground text-xs">
            {run.failure}
          </p>
        </RailSection>
      )}

      <RailSection title="Id">
        <p className="break-all font-mono text-muted-foreground text-xs">
          {run.id}
        </p>
      </RailSection>
    </aside>
  );
}
