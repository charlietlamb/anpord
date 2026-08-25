import { Skeleton } from "@anpord/ui/components/skeleton";
import { RailSection } from "@anpord/ui/components/ui/rail-section";
import { RAIL_FRAME } from "@anpord/ui/lib/rail-frame";
import { FlaskIcon } from "@phosphor-icons/react";
import { CellHistory } from "@/components/evals/cell-history";
import { EvalLayout, EvalMain } from "@/components/evals/eval-layout";
import {
  type RailFactShape,
  RailFactSkeleton,
} from "@/components/evals/rail-fact-skeleton";
import { RerunCellButton } from "@/components/evals/rerun-cell-button";
import { TrialListSkeleton } from "@/components/evals/trial-row-skeleton";

/* Passed, agreement, commands. "void" is gated on a cell that recorded one. */
const READING: readonly RailFactShape[] = [
  { width: "w-20" },
  { width: "w-28" },
  { width: "w-24" },
];

/** Harness, model, sandbox. */
const VARIANT: readonly RailFactShape[] = [
  { width: "w-28" },
  { width: "w-20" },
  { width: "w-16" },
];

/**
 * The cell screen before its trials are known.
 *
 * The rerun control is live rather than placeheld: it needs only the two ids
 * the address already carries, and a button that appears mid-load is a control
 * that was not there when the reader reached for it.
 *
 * History is the real component, which runs its own query and owns its own
 * loading state. Copying its two bars here made a second thing to keep in step
 * with it, and it already holds the section's height on its own.
 *
 * The setup section is left out. It renders only for a cell that recorded one,
 * and reserving three rows for something half of them lack would leave a hole
 * on the screens that do not.
 */
export function CellSkeleton({
  cellKey,
  runId,
}: {
  readonly cellKey: string;
  readonly runId: string;
}) {
  return (
    <EvalLayout>
      <EvalMain>
        <section className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3">
            {/* The heading's own geometry, with a bar where the case name
                will be: the icon and the line height are known already. */}
            <span className="flex shrink-0 items-center gap-1.5">
              <FlaskIcon className="size-4 shrink-0 text-muted-foreground" />
              <Skeleton className="h-3.5 w-32" />
            </span>

            <RerunCellButton cellKey={cellKey} runId={runId} trials={1} />
          </div>

          <TrialListSkeleton />
        </section>
      </EvalMain>

      <aside className={RAIL_FRAME}>
        <RailSection title="Reading">
          <RailFactSkeleton className="gap-2" facts={READING} />
        </RailSection>

        <RailSection title="Variant">
          <RailFactSkeleton facts={VARIANT} />
        </RailSection>

        <RailSection title="History">
          <CellHistory cellKey={cellKey} />
        </RailSection>
      </aside>
    </EvalLayout>
  );
}
