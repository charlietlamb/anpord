import { createFileRoute } from "@tanstack/react-router";
import { RUN, TRIALS } from "@/components/dev/eval-fixtures";
import { AUTUMN_TRAJECTORY } from "@/components/dev/timeline-fixtures";
import { TrialView } from "@/components/evals/trial-view";

export const Route = createFileRoute("/dev/shell/")({
  component: ShellTrial,
  staticData: { title: "fill-rollover-swept" },
});

const [BASE] = TRIALS;

function ShellTrial() {
  return BASE === undefined ? null : (
    <TrialView
      run={{
        ...RUN,
        case: { id: "fill-rollover-swept", name: "fill-rollover-swept" },
      }}
      trial={{
        ...BASE,
        status: "passed",
        timed: true,
        trajectory: AUTUMN_TRAJECTORY,
      }}
    />
  );
}
