import { Batches } from "@anpord/eval/grid/batches";
import { telemetryFor } from "@anpord/eval/telemetry";
import { AbortTaskRunError } from "@trigger.dev/sdk";
import { Effect, Layer, ManagedRuntime } from "effect";
import { WorkerLayer } from "../layer";

const runtime = ManagedRuntime.make(
  Layer.merge(WorkerLayer, telemetryFor("anpord-worker"))
);

export const executeBatch = (input: {
  readonly batchId: string;
  readonly organizationId: string;
}): Promise<number> =>
  runtime.runPromise(
    Effect.flatMap(Batches, (batches) => batches.execute(input.batchId)).pipe(
      Effect.catchTag("NotRunnable", (problem) =>
        Effect.die(new AbortTaskRunError(problem.message))
      ),
      Effect.tapErrorCause((cause) =>
        Effect.logError("worker could not run the batch", cause)
      ),
      Effect.orDie,
      Effect.annotateLogs(input),
      Effect.withSpan("Worker.executeBatch", {
        attributes: { batchId: input.batchId },
      })
    )
  );
