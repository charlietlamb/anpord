import type { EvalTailEvent } from "@anpord/schema/domain/eval-tail";
import type { EvalBatch } from "@anpord/schema/domain/evals";
import { AnpordApi } from "@anpord/schema/public/client";
import { Clock, Data, Duration, Effect, Fiber, Ref, Stream } from "effect";
import { tailBatch } from "./eval-tail";

const TICK = 1000;

const FLOOR_POLL = 15_000;

const running = (batch: EvalBatch) => batch.status === "running";

const settledIn = (batch: EvalBatch) =>
  batch.runs
    .flatMap((run) => run.trials)
    .filter((trial) => trial.status !== "queued" && trial.status !== "running")
    .length;

export interface BatchWatcher {
  readonly draw: (batch: EvalBatch, elapsedMs: number) => Effect.Effect<void>;
  readonly hear: (events: readonly EvalTailEvent[]) => Effect.Effect<void>;
}

class EvalWaitTimeout extends Data.TaggedError("EvalWaitTimeout")<{
  readonly batchId: string;
  readonly seconds: number;
}> {
  override get message() {
    return `Timed out after ${this.seconds}s waiting for ${this.batchId}. The batch was not cancelled.`;
  }
}

export const waitForBatch = (
  id: string,
  watcher: BatchWatcher,
  timeoutSeconds: number
) =>
  Effect.gen(function* () {
    const api = yield* AnpordApi;
    const startedAt = yield* Clock.currentTimeMillis;
    const latest = yield* Ref.make<EvalBatch | null>(null);

    const elapsed = Effect.map(
      Clock.currentTimeMillis,
      (now) => now - startedAt
    );

    const draw = Effect.gen(function* () {
      const batch = yield* Ref.get(latest);

      if (batch !== null) {
        yield* watcher.draw(batch, yield* elapsed);
      }
    });

    const read = Effect.gen(function* () {
      const batch = yield* api.evals.get({ payload: { id } });

      yield* Ref.set(latest, batch);
      yield* watcher.draw(batch, yield* elapsed);

      return batch;
    });

    const first = yield* read;

    if (!running(first)) {
      return first;
    }

    const ticking = yield* Effect.forkScoped(
      draw.pipe(Effect.delay(Duration.millis(TICK)), Effect.forever)
    );

    const watching = yield* Effect.forkScoped(
      tailBatch(id, api).pipe(
        Stream.runFoldEffect(settledIn(first), (seen, tail) =>
          watcher
            .hear(tail.events)
            .pipe(
              Effect.zipRight(
                tail.settled === seen && tail.running ? Effect.void : read
              ),
              Effect.as(tail.settled)
            )
        ),
        Effect.catchAll(() => Effect.void)
      )
    );

    const settled = yield* read.pipe(
      Effect.delay(Duration.millis(FLOOR_POLL)),
      Effect.repeat({ until: (batch: EvalBatch) => !running(batch) })
    );

    yield* Fiber.interrupt(ticking);
    yield* Fiber.interrupt(watching);

    return settled;
  }).pipe(
    Effect.scoped,
    Effect.timeoutFail({
      duration: Duration.seconds(timeoutSeconds),
      onTimeout: () =>
        new EvalWaitTimeout({ batchId: id, seconds: timeoutSeconds }),
    }),
    Effect.withSpan("Cli.waitForBatch", { attributes: { batchId: id } })
  );
