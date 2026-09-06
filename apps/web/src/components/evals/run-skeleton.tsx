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

const RUN_FACTS: readonly RailFactShape[] = [
  { width: "w-16" },
  { width: "w-24" },
  { width: "w-14" },
];

const VARIANT_FACTS: readonly RailFactShape[] = [
  { width: "w-28" },
  { width: "w-20" },
  { width: "w-16" },
];

export function RunSkeleton({ runId }: { readonly runId: string }) {
  return (
    <EvalLayout>
      <EvalMain>
        <section className="flex flex-col gap-1.5">
          <PageHeading icon={SquaresFourIcon} title="Cases" />
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
