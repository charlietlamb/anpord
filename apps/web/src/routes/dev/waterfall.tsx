import { TooltipProvider } from "@anpord/ui/components/tooltip";
import { PageHeading } from "@anpord/ui/components/ui/page-heading";
import { PulseIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { TRIALS } from "@/components/dev/eval-fixtures";
import { PreviewScreen } from "@/components/dev/preview-screen";
import { EvalLayout, EvalMain } from "@/components/evals/eval-layout";
import { TrialRail } from "@/components/evals/trial-rail";
import { Waterfall } from "@/components/evals/waterfall";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export const Route = createFileRoute("/dev/waterfall")({
  component: WaterfallPreview,
});

const TRIAL = TRIALS.find((candidate) => candidate.trajectory.length > 0);

function WaterfallPreview() {
  return (
    <TooltipProvider>
      <div className="flex flex-col gap-8 py-8">
        <div className="mx-auto flex w-full max-w-7xl justify-end px-5">
          <ThemeToggle />
        </div>

        {TRIAL ? (
          <PreviewScreen name="Trajectory">
            <EvalLayout>
              <EvalMain>
                <section className="flex flex-col gap-1.5">
                  <PageHeading icon={PulseIcon} title="Trajectory" />

                  <Waterfall
                    running={false}
                    timed={TRIAL.timed}
                    trajectory={TRIAL.trajectory}
                  />
                </section>
              </EvalMain>

              <TrialRail trial={TRIAL} />
            </EvalLayout>
          </PreviewScreen>
        ) : null}
      </div>
    </TooltipProvider>
  );
}
