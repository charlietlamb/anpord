import type { StartEvalRequest } from "@anpord/schema/domain/evals";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PlaygroundForm } from "@/components/evals/playground-form";
import { RunDistribution } from "@/components/evals/run-distribution";
import { TrialRow } from "@/components/evals/trial-row";
import { startEvalRun } from "@/lib/evals-client";
import { evalKeys } from "@/lib/query/eval-keys";
import { evalQueries } from "@/lib/query/eval-queries";

export const Route = createFileRoute("/_authed/evals/")({
  component: EvalsPlayground,
});

function EvalsPlayground() {
  const client = useQueryClient();
  const [runId, setRunId] = useState<string | null>(null);

  const run = useQuery({
    ...evalQueries.detail(runId ?? ""),
    enabled: runId !== null,
  });

  const start = useMutation({
    mutationFn: (request: StartEvalRequest) => startEvalRun(request),
    onSuccess: (started) => {
      setRunId(started.id);
      client.invalidateQueries({ queryKey: evalKeys.list() });
    },
  });

  const current = run.data;
  const running = current?.status === "running";

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-5 pt-5 pb-6">
        <div>
          <h1 className="font-heading text-2xl tracking-tight">Evals</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Run an agent against a task several times and see what it actually
            did, not only whether it passed.
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border p-4">
            <PlaygroundForm
              onStart={(request) => start.mutate(request)}
              pending={start.isPending || running}
            />

            {start.error === null ? null : (
              <p className="mt-4 text-destructive text-sm">
                {start.error.message}
              </p>
            )}
          </div>

          <div className="space-y-4">
            {current === undefined ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
                Run the task to see the trials, the commands each agent ran, and
                the exit code of every one.
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 text-muted-foreground text-sm">
                  <span>
                    {current.taskName} · {current.harness} · {current.model} ·{" "}
                    {current.provider}
                  </span>
                  {running ? <span>running...</span> : null}
                </div>

                {current.distribution === null ? null : (
                  <RunDistribution distribution={current.distribution} />
                )}

                {current.failure === null ? null : (
                  <p className="rounded-lg border border-destructive/50 p-4 text-destructive text-sm">
                    {current.failure}
                  </p>
                )}

                <div className="overflow-hidden rounded-lg border">
                  {current.trials.map((trial, index) => (
                    <TrialRow index={index} key={trial.ordinal} trial={trial} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
