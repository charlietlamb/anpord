import { Button } from "@anpord/ui/components/button";
import { BatchRuns } from "@anpord/ui/components/evals/batch-runs";
import { EvalStatusBadge } from "@anpord/ui/components/evals/eval-status-badge";
import { LivePip } from "@anpord/ui/components/evals/live-pip";
import { TooltipProvider } from "@anpord/ui/components/tooltip";
import { distributionStatus } from "@anpord/ui/lib/evals/eval-status";
import { createFileRoute } from "@tanstack/react-router";
import { useMockRun } from "@/components/dev/use-mock-run";
import { TrialView } from "@/components/evals/trial-view";
import { PageShell } from "@/components/layout/page-shell";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export const Route = createFileRoute("/dev/live")({
  component: LivePreview,
  ssr: false,
});

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

/* The real row opens the trial's own page; the trial is already below here, so
   opening it means scrolling to it. */
const timelineLink = () => (
  // biome-ignore lint/a11y/useAnchorContent: the row renders inside this anchor
  <a aria-label="Open this run" href="#trial" />
);

function LivePreview() {
  const { batch, done, elapsed, playing, replay, run, toggle, trial } =
    useMockRun();

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-8 pb-24">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 pt-6 xl:px-6">
          <span className="text-muted-foreground text-sm">
            A mocked run, replaying on a loop.
          </span>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs tabular-nums">
              {seconds(elapsed)}
            </span>
            <Button onClick={toggle} size="sm" variant="subtle">
              {playing ? "Pause" : "Play"}
            </Button>
            <Button onClick={replay} size="sm" variant="subtle">
              Replay
            </Button>
            <ThemeToggle />
          </div>
        </div>

        <PageShell
          description={
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-muted-foreground text-sm">
              {done ? null : <LivePip label="Running" />}

              <EvalStatusBadge
                size="xs"
                status={distributionStatus(run.distribution)}
              />
            </span>
          }
          title="Batch"
          width="wide"
        >
          <BatchRuns batch={batch} linkTo={timelineLink} />
        </PageShell>

        <div id="trial">
          <TrialView run={run} trial={trial} />
        </div>
      </div>
    </TooltipProvider>
  );
}
