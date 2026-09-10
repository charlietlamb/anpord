import { Skeleton } from "@anpord/ui/components/skeleton";
import { PageHeading } from "@anpord/ui/components/ui/page-heading";
import { RailSection } from "@anpord/ui/components/ui/rail-section";
import { RAIL_FRAME } from "@anpord/ui/lib/rail-frame";
import { PulseIcon } from "@phosphor-icons/react";
import { CellSetupSkeleton } from "@/components/evals/cell-setup-skeleton";
import { EvalLayout, EvalMain } from "@/components/evals/eval-layout";
import {
  type RailFactShape,
  RailFactSkeleton,
} from "@/components/evals/rail-fact-skeleton";
import { TrialCallsSkeleton } from "@/components/evals/trial-calls-skeleton";
import { ValidationInspectorSkeleton } from "@/components/evals/validation-inspector-skeleton";

/* Mirrors a waterfall row: h-5 with an h-1.5 track centred within it. */
const TRACKS = [
  { left: "left-0", width: "w-1/3" },
  { left: "left-[30%]", width: "w-1/4" },
  { left: "left-[52%]", width: "w-1/5" },
  { left: "left-[68%]", width: "w-1/6" },
  { left: "left-[80%]", width: "w-1/12" },
];

const OUTCOME: readonly RailFactShape[] = [
  { width: "w-14" },
  { width: "w-16" },
  { width: "w-28" },
];

const TIME: readonly RailFactShape[] = [
  { width: "w-20" },
  { share: true, width: "w-24" },
];

export function TrialSkeleton({ ordinal }: { readonly ordinal?: string }) {
  return (
    <EvalLayout>
      <EvalMain>
        <section className="flex flex-col gap-1.5">
          <PageHeading icon={PulseIcon} title="Trajectory" />

          <div className="flex flex-col gap-2">
            <div className="h-4" />

            <ol className="flex flex-col">
              {TRACKS.map((track) => (
                <li className="relative h-5" key={track.left}>
                  <Skeleton
                    className={`absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full ${track.left} ${track.width}`}
                  />
                </li>
              ))}
            </ol>
          </div>
        </section>

        <ValidationInspectorSkeleton />

        <CellSetupSkeleton />

        <TrialCallsSkeleton />
      </EvalMain>

      <aside className={RAIL_FRAME}>
        <RailSection title="Outcome">
          <RailFactSkeleton className="gap-2" facts={OUTCOME} />
        </RailSection>

        <RailSection title="Time">
          <RailFactSkeleton facts={TIME} />
        </RailSection>

        {ordinal === undefined ? null : (
          <RailSection title="Trial">
            <span className="text-sm tabular-nums">{ordinal}</span>
          </RailSection>
        )}
      </aside>
    </EvalLayout>
  );
}
