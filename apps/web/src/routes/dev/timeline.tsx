import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import { TooltipProvider } from "@anpord/ui/components/tooltip";
import { createFileRoute } from "@tanstack/react-router";
import { RUN, TRIALS } from "@/components/dev/eval-fixtures";
import { PreviewScreen } from "@/components/dev/preview-screen";
import {
  AUTUMN_TRAJECTORY,
  FAILED_TRAJECTORY,
  RUNNING_TRAJECTORY,
  UNTIMED_TRAJECTORY,
  WORST_CASE_TRAJECTORY,
} from "@/components/dev/timeline-fixtures";
import { TrialTimeline } from "@/components/evals/trial-timeline";
import { TrialView } from "@/components/evals/trial-view";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export const Route = createFileRoute("/dev/timeline")({
  component: TimelinePreview,
  ssr: false,
});

const [BASE] = TRIALS;

const STATES: readonly {
  readonly name: string;
  readonly running?: boolean;
  readonly timed?: boolean;
  readonly trajectory: readonly EvalJournalEntry[];
}[] = [
  { name: "A command failed", trajectory: FAILED_TRAJECTORY },
  {
    name: "A step still running",
    running: true,
    trajectory: RUNNING_TRAJECTORY,
  },
  {
    name: "Durations not recorded",
    timed: false,
    trajectory: UNTIMED_TRAJECTORY,
  },
  { name: "Long titles, many sections", trajectory: WORST_CASE_TRAJECTORY },
  { name: "No steps yet", running: true, trajectory: [] },
];

function TimelinePreview() {
  return (
    <TooltipProvider>
      <div className="flex flex-col gap-8 py-8">
        <div className="mx-auto flex w-full max-w-7xl justify-end px-5">
          <ThemeToggle />
        </div>

        {BASE === undefined ? null : (
          <PreviewScreen name="Trial page">
            <TrialView
              run={{
                ...RUN,
                case: {
                  id: "fill-rollover-swept",
                  name: "fill-rollover-swept",
                },
              }}
              trial={{
                ...BASE,
                status: "passed",
                timed: true,
                trajectory: AUTUMN_TRAJECTORY,
              }}
            />
          </PreviewScreen>
        )}

        {STATES.map((state) => (
          <PreviewScreen key={state.name} name={state.name}>
            <div className="mx-auto w-full max-w-5xl overflow-y-auto px-5 py-6">
              <TrialTimeline
                running={state.running ?? false}
                timed={state.timed ?? true}
                trajectory={state.trajectory}
              />
            </div>
          </PreviewScreen>
        ))}
      </div>
    </TooltipProvider>
  );
}
