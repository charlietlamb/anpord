import { CopyableId } from "@anpord/ui/components/ui/copyable-id";
import { PageHeading } from "@anpord/ui/components/ui/page-heading";
import { RailSection } from "@anpord/ui/components/ui/rail-section";
import { RAIL_FRAME } from "@anpord/ui/lib/rail-frame";
import { SquaresFourIcon } from "@phosphor-icons/react";
import { EvalLayout, EvalMain } from "@/components/evals/eval-layout";
import {
  type RailFactShape,
  RailFactSkeleton,
} from "@/components/evals/rail-fact-skeleton";
import { RunGridSkeleton } from "@/components/evals/run-grid-skeleton";

/* Status, started, cases. Duration is gated on a finished run, and a bar for
   a fact half the runs lack over-fills the section it stands in for. */
const RUN_FACTS: readonly RailFactShape[] = [
  { width: "w-16" },
  { width: "w-24" },
  { width: "w-14" },
];

/** Harness, model, sandbox. */
const VARIANT_FACTS: readonly RailFactShape[] = [
  { width: "w-28" },
  { width: "w-20" },
  { width: "w-16" },
];

/**
 * The run screen before its cells are known.
 *
 * Everything the address already tells us is drawn for real: the layout, the
 * headings, the section titles, and the run's own id, which is in the URL and
 * so can be copied before anything has loaded. Only the values wait.
 *
 * "Why it ended" is left out. It renders only for a run that stopped early,
 * and a section that appears and then vanishes is a worse shift than one that
 * simply arrives.
 */
export function RunSkeleton({ runId }: { readonly runId: string }) {
  return (
    <EvalLayout>
      <EvalMain>
        <section className="flex flex-col gap-1.5">
          <PageHeading icon={SquaresFourIcon} title="Results" />
          <RunGridSkeleton />
        </section>
      </EvalMain>

      <aside className={RAIL_FRAME}>
        <RailSection title="Run">
          <RailFactSkeleton className="gap-1" facts={RUN_FACTS} />
        </RailSection>

        <RailSection title="Variant">
          <RailFactSkeleton facts={VARIANT_FACTS} />
        </RailSection>

        <RailSection title="Id">
          <CopyableId value={runId} />
        </RailSection>
      </aside>
    </EvalLayout>
  );
}
