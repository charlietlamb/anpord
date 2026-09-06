import { CredentialResolver } from "@anpord/eval/credentials/resolver";
import { rebuildRun } from "@anpord/eval/grid/rebuild-run";
import { GridRun } from "@anpord/eval/grid/run";
import { RunQuery } from "@anpord/eval/repositories/run-query";
import { telemetryFor } from "@anpord/eval/telemetry";
import { AbortTaskRunError } from "@trigger.dev/sdk";
import { Effect, Layer, ManagedRuntime } from "effect";
import { WorkerLayer } from "../layer";

/* Built once per process: rebuilding the layer per task would open a database pool per trial. Named apart from the server so a trace shows which side of the dispatch a span came from. */
const runtime = ManagedRuntime.make(
  Layer.merge(WorkerLayer, telemetryFor("anpord-worker"))
);

interface StoredRun {
  readonly organizationId: string;
  readonly runId: string;
}

export const executeStoredRun = (run: StoredRun): Promise<number> =>
  runtime.runPromise(
    Effect.gen(function* () {
      const grid = yield* GridRun;

      /* Bound rather than resolved against an actor: this process has no session. */
      const rebuilt = yield* rebuildRun(
        {
          credentials: yield* CredentialResolver,
          grid,
          query: yield* RunQuery,
        },
        {
          organizationId: run.organizationId,
          runId: run.runId,
          source: { bound: true },
        }
      );

      yield* grid.execute(rebuilt);

      return rebuilt.input.cases.length * rebuilt.input.tasks.length;
    }).pipe(
      Effect.tapErrorCause((cause) =>
        Effect.logError("worker could not run the grid", cause)
      ),
      /* Aborted, not died: a retry would find the work the first attempt claimed and report that progress as the failure. */
      Effect.catchTag("NotRunnable", (problem) =>
        Effect.die(new AbortTaskRunError(problem.message))
      ),
      Effect.orDie,
      Effect.annotateLogs({
        organizationId: run.organizationId,
        runId: run.runId,
      }),
      Effect.withSpan("Worker.evalRun", {
        attributes: { runId: run.runId },
      })
    )
  );
