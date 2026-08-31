import { CredentialResolver } from "@anpord/eval/credentials/connections";
import { rebuildRun } from "@anpord/eval/grid/from-stored";
import { GridRun } from "@anpord/eval/grid/run";
import { RunQuery } from "@anpord/eval/repositories/run-query";
import { schemaTask } from "@trigger.dev/sdk";
import { Effect, ManagedRuntime, Schema } from "effect";
import { WorkerLayer } from "../layer";

/* Built once per worker process rather than per run: a layer holds a database
   pool and a sandbox registry, and rebuilding those for every task would open
   a pool per trial. */
const runtime = ManagedRuntime.make(WorkerLayer);

/* Identifiers only. Payloads are recorded and shown in the dashboard, so the
   worker resolves credentials itself from what the run already recorded. */
const EvalRunPayload = Schema.Struct({
  organizationId: Schema.String,
  runId: Schema.String,
});

type EvalRunPayload = typeof EvalRunPayload.Type;

const decode = Schema.decodeUnknownSync(EvalRunPayload);

export const evalRun = schemaTask({
  id: "eval-run",
  machine: "small-1x",
  maxDuration: 3600,
  schema: (payload: unknown) => decode(payload),
  run: async (payload: EvalRunPayload) => {
    const cells = await runtime.runPromise(
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
            organizationId: payload.organizationId,
            runId: payload.runId,
            source: { bound: true },
          }
        );

        yield* grid.execute(rebuilt);

        return rebuilt.input.cases.length * rebuilt.input.tasks.length;
      }).pipe(
        /* Dies rather than returns a failure: a run that cannot be rebuilt is
           not something a retry fixes, and the tag is what the log carries. */
        Effect.tapErrorCause((cause) =>
          Effect.logError("worker could not run the grid", cause)
        ),
        Effect.orDie,
        Effect.annotateLogs({
          organizationId: payload.organizationId,
          runId: payload.runId,
        }),
        Effect.withSpan("Worker.evalRun", {
          attributes: { runId: payload.runId },
        })
      )
    );

    return { cells };
  },
});
