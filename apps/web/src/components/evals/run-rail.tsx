import type { EvalRun } from "@anpord/schema/domain/evals";
import { CopyableId } from "@anpord/ui/components/ui/copyable-id";
import { RailFact } from "@anpord/ui/components/ui/rail-fact";
import { RailSection } from "@anpord/ui/components/ui/rail-section";
import { RAIL_FRAME } from "@anpord/ui/lib/rail-frame";
import { ClockIcon, GridFourIcon, TimerIcon } from "@phosphor-icons/react";
import { RunVariants } from "@/components/evals/run-variants";
import { clock, elapsed } from "@/lib/evals/duration";
import { runStatusMark } from "@/lib/evals/eval-status";

export function RunRail({ run }: { readonly run: EvalRun }) {
  const status = runStatusMark(run.status);
  const took = elapsed(
    run.startedAt.epochMillis,
    run.finishedAt?.epochMillis ?? null
  );

  return (
    <aside className={RAIL_FRAME}>
      <RailSection title="Run">
        <div className="flex flex-col gap-1">
          <RailFact
            Icon={status.Icon}
            label="status"
            layout="stated"
            tone={status.tone}
            value={run.status}
          />

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
            hint="Each case runs against every variant, and each pair is one cell. A cell is what a baseline is kept for."
            Icon={GridFourIcon}
            label="cases"
            layout="stated"
            value={
              run.cases.length === 1 ? "1 case" : `${run.cases.length} cases`
            }
          />
        </div>
      </RailSection>

      {run.tasks.length === 0 ? null : (
        <RailSection title="Variant">
          <RunVariants tasks={run.tasks} />
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
