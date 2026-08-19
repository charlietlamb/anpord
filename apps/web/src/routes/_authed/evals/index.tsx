import type { StartEvalRequest } from "@anpord/schema/domain/evals";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PlaygroundForm } from "@/components/evals/playground-form";
import { RunPanel } from "@/components/evals/run-panel";
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

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-5 pt-5 pb-6">
        <div>
          <h1 className="font-heading text-2xl tracking-tight">Evals</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Run an agent against a task several times and see what it did, not
            only whether it passed.
          </p>
        </div>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <PlaygroundForm
              onStart={(request) => start.mutateAsync(request)}
              running={run.data?.status === "running"}
            />

            {start.error === null ? null : (
              <p className="text-destructive text-sm">{start.error.message}</p>
            )}
          </div>

          <RunPanel run={run.data} />
        </div>
      </div>
    </div>
  );
}
