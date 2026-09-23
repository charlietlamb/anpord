import { TooltipProvider } from "@anpord/ui/components/tooltip";
import { PageHeading } from "@anpord/ui/components/ui/page-heading";
import { CatchBoundary, createFileRoute } from "@tanstack/react-router";
import { CASE_DETAIL, CASE_HISTORY } from "@/components/dev/case-fixtures";
import { CELL, RUN, TRIALS } from "@/components/dev/eval-fixtures";
import { PreviewScreen } from "@/components/dev/preview-screen";
import {
  LOCAL_RUN,
  LOCAL_TRIAL,
  VALIDATED_RUN,
  VALIDATED_SETUP,
  VALIDATED_TRIAL,
} from "@/components/dev/trial-fixtures";
import { AgentSetup } from "@/components/evals/agent-setup";
import { CaseActions } from "@/components/evals/case-actions";
import { CaseMeta } from "@/components/evals/case-meta";
import { CaseReadings } from "@/components/evals/case-readings";
import { EvalForm } from "@/components/evals/eval-form";
import { EvalMain } from "@/components/evals/eval-layout";
import { TrialCalls } from "@/components/evals/trial-calls";
import { TrialChecks } from "@/components/evals/trial-checks";
import { TrialSkeleton } from "@/components/evals/trial-skeleton";
import { TrialView } from "@/components/evals/trial-view";
import { Waterfall } from "@/components/evals/waterfall";
import { EmptyNote } from "@/components/layout/empty-note";
import { PageShell } from "@/components/layout/page-shell";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export const Route = createFileRoute("/dev/evals")({
  component: EvalsPreview,
  ssr: false,
});

const TRIAL = TRIALS[0];

function EvalsPreview() {
  return (
    <TooltipProvider>
      <div className="flex flex-col gap-10 pb-24">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 pt-6 xl:px-6">
          <h1 className="font-heading text-xl tracking-tight">Evals</h1>
          <ThemeToggle />
        </div>

        <PreviewScreen name="Validation and calls">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-5 py-5">
            <TrialChecks setup={VALIDATED_SETUP} trial={VALIDATED_TRIAL} />
            <TrialCalls
              trajectory={[
                {
                  _tag: "toolCall",
                  name: "notra-markdown.get_markdown",
                  input: "{}",
                  output: JSON.stringify({
                    content: [
                      {
                        type: "text",
                        text: "# Deploying Notra\n\n1. Set the **environment variables**.\n2. Run `bun run build`.\n3. Deploy and check the health endpoint.",
                      },
                    ],
                    structured_content: {
                      content:
                        "# Deploying Notra\n\n1. Set the **environment variables**.\n2. Run `bun run build`.\n3. Deploy and check the health endpoint.",
                      lineCount: 5,
                    },
                  }),
                  status: "completed",
                  finishedAtMillis: 0,
                },
                {
                  _tag: "toolCall",
                  name: "catalog.items_get",
                  input: '{"id":"missing"}',
                  error: "Unknown item: missing",
                  status: "failed",
                  finishedAtMillis: 1,
                },
                {
                  _tag: "toolCall",
                  name: "catalog.items_get",
                  input: '{"id":"ci_fixture"}',
                  output: '{"id":"ci_fixture","name":"CI fixture"}',
                  status: "completed",
                  finishedAtMillis: 2,
                },
                {
                  _tag: "command",
                  command: "catalog items list",
                  output: '[{"id":"ci_fixture","name":"CI fixture"}]',
                  exitCode: 0,
                  startedAtMillis: 3,
                  finishedAtMillis: 4,
                },
              ]}
            />
          </div>
        </PreviewScreen>

        <PreviewScreen name="New eval">
          <div className="mx-auto w-full max-w-3xl px-5 py-5">
            {/* The form throws when nobody is signed in, which must not take the other previews with it. */}
            <CatchBoundary
              errorComponent={() => (
                <EmptyNote>Sign in to preview the form.</EmptyNote>
              )}
              getResetKey={() => "eval-form"}
            >
              <EvalForm
                onSubmit={(draft) => {
                  globalThis.console.log("draft", draft);

                  return Promise.resolve();
                }}
                submitting={false}
              />
            </CatchBoundary>
          </div>
        </PreviewScreen>

        <PreviewScreen name="Eval in code">
          <PageShell title="New eval" width="wide">
            <AgentSetup />
          </PageShell>
        </PreviewScreen>

        <PreviewScreen name="One case">
          <PageShell
            actions={<CaseActions detail={CASE_DETAIL} />}
            description={<CaseMeta subject={CASE_DETAIL} />}
            title={CASE_DETAIL.name}
            width="wide"
          >
            <CaseReadings
              caseId={CASE_DETAIL.id}
              history={CASE_HISTORY}
              onPage={() => undefined}
            />
          </PageShell>
        </PreviewScreen>

        <PreviewScreen name="A trial that has not reported yet">
          <EvalMain>
            <section className="flex flex-col gap-1.5">
              <PageHeading title="Trajectory" />
              <Waterfall running={true} timed={false} trajectory={[]} />
            </section>
          </EvalMain>
        </PreviewScreen>

        {TRIAL ? (
          <PreviewScreen name="One trial">
            <TrialView
              caseId={CASE_DETAIL.id}
              cell={CELL}
              run={RUN}
              trial={TRIAL}
            />
          </PreviewScreen>
        ) : null}

        <PreviewScreen name="Trial judged by validators">
          <TrialView
            caseId={CASE_DETAIL.id}
            cell={VALIDATED_RUN.cells[0] ?? CELL}
            run={VALIDATED_RUN}
            trial={VALIDATED_TRIAL}
          />
        </PreviewScreen>

        <PreviewScreen name="Local trial that reported nothing">
          <TrialView
            caseId={CASE_DETAIL.id}
            cell={LOCAL_RUN.cells[0] ?? CELL}
            run={LOCAL_RUN}
            trial={LOCAL_TRIAL}
          />
        </PreviewScreen>

        <PreviewScreen name="Loading: one trial">
          <TrialSkeleton />
        </PreviewScreen>
      </div>
    </TooltipProvider>
  );
}
