import { GridRun } from "@anpord/eval/grid/run";
import { ContinueRuns } from "@anpord/eval/services/continue-run";
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
        const runs = yield* ContinueRuns;
        const grid = yield* GridRun;

        const rebuilt = yield* runs.build({
          organizationId: payload.organizationId,
          runId: payload.runId,
        });

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
