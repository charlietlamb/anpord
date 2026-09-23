import { Skeleton } from "@anpord/ui/components/skeleton";
import { PageHeading } from "@anpord/ui/components/ui/page-heading";
import { RailSection } from "@anpord/ui/components/ui/rail-section";
import { cn } from "@anpord/ui/lib/utils";
import {
  CheckSquareIcon,
  SlidersHorizontalIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react";
import { CellSetupSkeleton } from "@/components/evals/cell-setup-skeleton";
import { EvalLayout, EvalMain, EvalRail } from "@/components/evals/eval-layout";
import {
  type RailFactShape,
  RailFactSkeleton,
} from "@/components/evals/rail-fact-skeleton";
import { TrialCallsSkeleton } from "@/components/evals/trial-calls-skeleton";
import { TrialSections } from "@/components/evals/trial-sections";
import { ValidationInspectorSkeleton } from "@/components/evals/validation-inspector-skeleton";
import {
  BAR,
  FRACTIONS,
  LABEL_WIDTH,
  WATERFALL_ROW,
} from "@/components/evals/waterfall-scale";

/* Mirrors a waterfall row: a named gutter, then the bar on the track. */
const TRACKS = [
  { label: "w-40", left: "left-0", width: "w-1/3" },
  { label: "w-52", left: "left-[30%]", width: "w-1/4" },
  { label: "w-44", left: "left-[52%]", width: "w-1/5" },
  { label: "w-36", left: "left-[68%]", width: "w-1/6" },
  { label: "w-48", left: "left-[80%]", width: "w-1/12" },
];

/* The end tick hangs back inside the chart, as the real axis does. */
const TICK_SHIFT: Record<string, string> = {
  "1": "translateX(-100%)",
};
const MID_TICK = "translateX(-50%)";

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
          <PageHeading title="Trajectory" />

          <div className="flex flex-col gap-2">
            {/* The axis stands where its ticks will, so the chart does not lift. */}
            <div className="flex items-end">
              <span className="shrink-0" style={{ width: LABEL_WIDTH }} />

              <div className="relative h-4 min-w-0 flex-1">
                {FRACTIONS.map((fraction) => (
                  <Skeleton
                    className="absolute top-0.5 h-2.5 w-8"
                    key={fraction}
                    style={{
                      left: `${fraction * 100}%`,
                      transform:
                        fraction === 0
                          ? undefined
                          : (TICK_SHIFT[String(fraction)] ?? MID_TICK),
                    }}
                  />
                ))}
              </div>
            </div>

            <ol className="flex flex-col">
              {TRACKS.map((track) => (
                <li
                  className={cn("flex items-center", WATERFALL_ROW)}
                  key={track.left}
                >
                  <span
                    className="flex shrink-0 items-center gap-1.5 pr-3 pl-1"
                    style={{ width: LABEL_WIDTH }}
                  >
                    <Skeleton className="size-3 shrink-0 rounded-sm" />
                    <Skeleton className={cn("h-3", track.label)} />
                  </span>

                  <span className="relative h-full min-w-0 flex-1">
                    <Skeleton
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2",
                        BAR,
                        track.left,
                        track.width
                      )}
                    />
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <TrialSections
          sections={[
            {
              Icon: CheckSquareIcon,
              content: <ValidationInspectorSkeleton titled={false} />,
              label: "Validation",
              value: "validation",
            },
            {
              Icon: SlidersHorizontalIcon,
              content: <CellSetupSkeleton />,
              label: "Setup",
              value: "setup",
            },
            {
              Icon: SquaresFourIcon,
              content: <TrialCallsSkeleton />,
              label: "Calls",
              value: "calls",
            },
          ]}
        />
      </EvalMain>

      <EvalRail>
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
      </EvalRail>
    </EvalLayout>
  );
}
