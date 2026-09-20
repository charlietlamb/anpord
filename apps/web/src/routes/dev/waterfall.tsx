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
import { TrialCalls } from "@/components/evals/trial-calls";
import { TrialRail } from "@/components/evals/trial-rail";
import { TrialSections } from "@/components/evals/trial-sections";
import { ValidationInspector } from "@/components/evals/validation-inspector";
import { Waterfall } from "@/components/evals/waterfall";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { fileIcon } from "@/lib/evals/file-presentation";

export const Route = createFileRoute("/dev/waterfall")({
  component: WaterfallPreview,
});

const TRIAL = TRIALS.find((candidate) => candidate.trajectory.length > 0);

const RUNNING_TRAJECTORY = [
  ...(TRIAL?.trajectory ?? []).slice(0, 3),
  {
    _tag: "command" as const,
    command:
      "/bin/bash -lc \"ls -la && printf '\\\\n--- package ---' && cat package.json\"",
    exitCode: null,
    finishedAtMillis: null,
    output: "",
    startedAtMillis: (TRIAL?.trajectory[0]?.finishedAtMillis ?? 0) + 500,
  },
];

const SAMPLE = VALIDATION_TRIALS[0]?.validations?.[0];

const QUEUED_TRIALS =
  SAMPLE === undefined
    ? []
    : [
        {
          ordinal: 1,
          validations: [
            {
              ...SAMPLE,
              durationMs: null,
              status: "queued" as const,
            },
            {
              ...SAMPLE,
              durationMs: null,
              id: "code:running",
              name: "proPlanLive",
              status: "running" as const,
            },
          ],
        },
      ];

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

        <PreviewScreen name="File marks">
          <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-4 px-5">
            {[
              "autumn.config.ts",
              "app.tsx",
              "index.js",
              "main.py",
              "notes.md",
              "style.css",
              "logo.svg",
              "data.json",
            ].map((path) => {
              const Glyph = fileIcon(path);

              return (
                <span className="flex items-center gap-2 text-xs" key={path}>
                  <Glyph
                    aria-hidden="true"
                    className="size-3.5 shrink-0 text-muted-foreground"
                  />
                  <span className="font-mono">{path}</span>
                </span>
              );
            })}
          </div>
        </PreviewScreen>

        <PreviewScreen name="A step still running">
          <div className="mx-auto w-full max-w-5xl px-5">
            <Waterfall
              running={true}
              timed={true}
              trajectory={RUNNING_TRAJECTORY}
            />
          </div>
        </PreviewScreen>

        <PreviewScreen name="Pending validators">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-5">
            <ValidationInspector titled={false} trials={QUEUED_TRIALS} />
          </div>
        </PreviewScreen>

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
                  content: <TrialCalls trajectory={TRIAL?.trajectory ?? []} />,
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
