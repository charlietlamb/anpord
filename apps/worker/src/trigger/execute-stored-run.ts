import { CredentialResolver } from "@anpord/eval/credentials/connections";
import { rebuildRun } from "@anpord/eval/grid/rebuild-run";
import { GridRun } from "@anpord/eval/grid/run";
import { RunQuery } from "@anpord/eval/repositories/run-query";
import { telemetryFor } from "@anpord/eval/telemetry";
import { AbortTaskRunError } from "@trigger.dev/sdk";
import { Effect, Layer, ManagedRuntime } from "effect";
import { WorkerLayer } from "../layer";

/* Built once per worker process rather than per run: a layer holds a database
   pool and a sandbox registry, and rebuilding those for every task would open
   a pool per trial.

   Named apart from the server so a trace shows which side of the dispatch a
   span came from, into the same dataset. */
const runtime = ManagedRuntime.make(
  Layer.merge(WorkerLayer, telemetryFor("anpord-worker"))
);

interface StoredRun {
  readonly organizationId: string;
  readonly runId: string;
}

/** Runs a grid that is already recorded, and answers how many cells it held. */
export const executeStoredRun = (run: StoredRun): Promise<number> =>
  runtime.runPromise(
    Effect.gen(function* () {
      const grid = yield* GridRun;

      /* Bound rather than resolved against an actor: this process has no
         session, and a person already chose these credentials when they
         started the run. */
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
      /* A run nobody can rebuild is not a run a retry rebuilds. Aborting says
         so, where dying looks transient: the first attempt claims the run and
         opens a trial, and every retry after it finds work under way and
         fails, which reports the run's own progress as its failure. */
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
