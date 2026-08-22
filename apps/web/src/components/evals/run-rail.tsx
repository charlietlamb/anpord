import type { EvalRun } from "@anpord/schema/domain/evals";
import { CopyableId } from "@anpord/ui/components/ui/copyable-id";
import { RailFact } from "@anpord/ui/components/ui/rail-fact";
import { RailSection } from "@anpord/ui/components/ui/rail-section";
import { RAIL_FRAME } from "@anpord/ui/lib/rail-frame";
import { ClockIcon, GridFourIcon, TimerIcon } from "@phosphor-icons/react";
import { RunStatusBadge } from "@/components/evals/eval-status-badge";
import { VariantFacts } from "@/components/evals/variant-facts";
import { clock, elapsed } from "@/lib/evals/duration";

/**
 * What the run is, held in view while its cells scroll past.
 *
 * Everything here is constant for the whole run, which is what makes it a rail
 * rather than a row: a reader checks the provider once and reads the results
 * for as long as the list is long.
 */
export function RunRail({ run }: { readonly run: EvalRun }) {
  const took = elapsed(
    run.startedAt.epochMillis,
    run.finishedAt?.epochMillis ?? null
  );

  return (
    <aside className={RAIL_FRAME}>
      <RailSection title="Run">
        <div className="flex flex-col gap-1">
          <div className="flex h-6 items-center gap-2">
            <RunStatusBadge status={run.status} />
          </div>

          <RailFact
            Icon={ClockIcon}
            label="started"
            layout="stated"
            value={clock(run.startedAt.epochMillis)}
          />
          {took === null ? null : (
            <RailFact
              Icon={TimerIcon}
              label="duration"
              layout="stated"
              value={`took ${took}`}
            />
          )}
          <RailFact
            hint="Cases across variants. Every pair is one cell, and a cell is what a baseline is kept for."
            Icon={GridFourIcon}
            label="grid"
            layout="stated"
            value={`${run.cases.length} × ${run.tasks.length} grid`}
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
        <CopyableId className="text-muted-foreground text-xs" value={run.id} />
      </RailSection>
    </aside>
  );
}
