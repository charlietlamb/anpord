import { Skeleton } from "@anpord/ui/components/skeleton";
import { PageHeading } from "@anpord/ui/components/ui/page-heading";
import { RailSection } from "@anpord/ui/components/ui/rail-section";
import { RAIL_FRAME } from "@anpord/ui/lib/rail-frame";
import { PulseIcon } from "@phosphor-icons/react";
import { EvalLayout, EvalMain } from "@/components/evals/eval-layout";
import {
  type RailFactShape,
  RailFactSkeleton,
} from "@/components/evals/rail-fact-skeleton";

/* A waterfall row is `h-5` and its track sits `h-1.5` centred within it, so
   the skeleton is that track at the offsets a real trajectory takes: work
   starts at the left and the bars march right as one step waits on the last. */
const TRACKS = [
  { left: "left-0", width: "w-1/3" },
  { left: "left-[30%]", width: "w-1/4" },
  { left: "left-[52%]", width: "w-1/5" },
  { left: "left-[68%]", width: "w-1/6" },
  { left: "left-[80%]", width: "w-1/12" },
];

/** Verdict, exit code, commands. */
const OUTCOME: readonly RailFactShape[] = [
  { width: "w-14" },
  { width: "w-16" },
  { width: "w-28" },
];

/* Duration, then sandbox with the share bar it draws after its value. The two
   gated on a measured trial are left out: reserving rows for facts half the
   trials lack leaves a hole on the ones that do not carry them. */
const TIME: readonly RailFactShape[] = [
  { width: "w-20" },
  { share: true, width: "w-24" },
];

/**
 * The trial screen before its trajectory is known.
 *
 * The axis is a fixed `h-4` whatever the timings turn out to be, so it is
 * drawn as a real empty band rather than placeheld, and the rows beneath it
 * keep the height they will settle at.
 */
export function TrialSkeleton() {
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
      </EvalMain>

      <aside className={RAIL_FRAME}>
        <RailSection title="Outcome">
          <RailFactSkeleton className="gap-2" facts={OUTCOME} />
        </RailSection>

        <RailSection title="Time">
          <RailFactSkeleton facts={TIME} />
        </RailSection>
      </aside>
    </EvalLayout>
  );
}
