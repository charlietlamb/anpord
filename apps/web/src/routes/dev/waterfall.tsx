import { TooltipProvider } from "@anpord/ui/components/tooltip";
import { CheckSquareIcon, SquaresFourIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { CONVERSATION } from "@/components/dev/conversation-fixture";
import { RUN, TRIALS } from "@/components/dev/eval-fixtures";
import { PreviewScreen } from "@/components/dev/preview-screen";
import {
  VALIDATED_SETUP,
  VALIDATED_TRIAL,
} from "@/components/dev/trial-fixtures";
import { VALIDATION_TRIALS } from "@/components/dev/validation-fixtures";
import { Conversation } from "@/components/evals/conversation";
import { ConversationStep } from "@/components/evals/conversation-step";
import { TrialCalls } from "@/components/evals/trial-calls";
import { TrialChecks } from "@/components/evals/trial-checks";
import { TrialSections } from "@/components/evals/trial-sections";
import { TrialView } from "@/components/evals/trial-view";
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

const LONG_CALLS = [
  {
    _tag: "command" as const,
    command:
      "/bin/bash -lc \"ls -la && printf '\\\\n--- files ---\\\\n' && rg --files -g '!node_modules' | head -80 && printf '\\\\n--- atmn ---' && cat package.json\"",
    exitCode: 0,
    finishedAtMillis: 2000,
    output: "a".repeat(400),
    startedAtMillis: 1000,
  },
  {
    _tag: "command" as const,
    command:
      "/bin/bash -lc 'npx atmn skills autumn-concepts --ref references/feature.md; npx atmn skills autumn-catalog --ref references/billing-controls.md'",
    exitCode: 1,
    finishedAtMillis: 4000,
    output:
      "line one that is quite long and keeps going past the edge of the panel it sits inside\\nline two",
    startedAtMillis: 3000,
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

        <PreviewScreen name="Conversation">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-5">
            <Conversation
              running={false}
              trajectory={CONVERSATION}
              written={{
                artifacts: [
                  { byteSize: 412, path: "autumn.config.ts", sha256: "dev" },
                ],
                trial: { trialId: "trl_dev" },
              }}
            />
          </div>
        </PreviewScreen>

        <PreviewScreen name="Tool calls, open">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-5">
            {CONVERSATION.flatMap((entry) =>
              entry._tag === "command" || entry._tag === "toolCall"
                ? [entry]
                : []
            )
              .slice(0, 3)
              .map((call, index) => (
                <ConversationStep
                  call={call}
                  defaultOpen={index > 0}
                  key={call.startedAtMillis}
                />
              ))}
          </div>
        </PreviewScreen>

        <PreviewScreen name="Conversation as a timeline">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-5">
            <Waterfall running={false} timed={true} trajectory={CONVERSATION} />
          </div>
        </PreviewScreen>

        {TRIAL ? (
          <PreviewScreen name="Trajectory">
            <TrialView run={RUN} trial={TRIAL} />
          </PreviewScreen>
        ) : null}

        <PreviewScreen name="Long calls">
          <div className="mx-auto w-full max-w-3xl px-5">
            <TrialCalls trajectory={LONG_CALLS} />
          </div>
        </PreviewScreen>

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
            <TrialChecks
              setup={VALIDATED_SETUP}
              trial={{
                ...VALIDATED_TRIAL,
                validations: QUEUED_TRIALS[0]?.validations,
              }}
            />
          </div>
        </PreviewScreen>

        <PreviewScreen name="Sections as tabs">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-5">
            <TrialSections
              sections={[
                {
                  Icon: CheckSquareIcon,
                  content: (
                    <TrialChecks
                      setup={VALIDATED_SETUP}
                      trial={VALIDATED_TRIAL}
                    />
                  ),
                  label: "Checks",
                  value: "checks",
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
