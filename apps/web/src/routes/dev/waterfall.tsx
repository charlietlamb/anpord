import { TooltipProvider } from "@anpord/ui/components/tooltip";
import { PageHeading } from "@anpord/ui/components/ui/page-heading";
import {
  CheckSquareIcon,
  PulseIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { TRIALS } from "@/components/dev/eval-fixtures";
import { PreviewScreen } from "@/components/dev/preview-screen";
import { VALIDATION_TRIALS } from "@/components/dev/validation-fixtures";
import { EvalLayout, EvalMain } from "@/components/evals/eval-layout";
import { TrialRail } from "@/components/evals/trial-rail";
import { TrialSections } from "@/components/evals/trial-sections";
import { ValidationInspector } from "@/components/evals/validation-inspector";
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

        <PreviewScreen name="Sections as tabs">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-5">
            <TrialSections
              sections={[
                {
                  Icon: CheckSquareIcon,
                  content: (
                    <ValidationInspector
                      titled={false}
                      trials={VALIDATION_TRIALS}
                    />
                  ),
                  label: "Validation",
                  value: "validation",
                },
                {
                  Icon: SquaresFourIcon,
                  content: (
                    <p className="text-muted-foreground text-xs">No calls.</p>
                  ),
                  label: "Calls",
                  value: "calls",
                },
              ]}
            />
          </div>
        </PreviewScreen>
      </div>
    </TooltipProvider>
  );
}
