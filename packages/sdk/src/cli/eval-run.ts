import type { EvalTailEvent } from "@anpord/schema/domain/eval-tail";
import type { EvalRun } from "@anpord/schema/domain/evals";
import { AnpordApi } from "@anpord/schema/public/client";
import { Clock, Data, Duration, Effect, Fiber, Ref, Stream } from "effect";
import { tailRun } from "./eval-tail";

const TICK = 1000;

const FLOOR_POLL = 15_000;

const running = (run: EvalRun) => run.status === "running";

const settledIn = (run: EvalRun) =>
  run.cells
    .flatMap((cell) => cell.trials)
    .filter((trial) => trial.status !== "queued" && trial.status !== "running")
    .length;

export interface RunWatcher {
  readonly draw: (run: EvalRun, elapsedMs: number) => Effect.Effect<void>;
  readonly hear: (events: readonly EvalTailEvent[]) => Effect.Effect<void>;
}

class EvalWaitTimeout extends Data.TaggedError("EvalWaitTimeout")<{
  readonly runId: string;
  readonly seconds: number;
}> {
  override get message() {
    return `Timed out after ${this.seconds}s waiting for ${this.runId}. The remote run was not cancelled.`;
  }
}

export const waitForRun = (
  id: string,
  watcher: RunWatcher,
  timeoutSeconds: number
) =>
  Effect.gen(function* () {
    const api = yield* AnpordApi;
    const startedAt = yield* Clock.currentTimeMillis;
    const latest = yield* Ref.make<EvalRun | null>(null);

    const elapsed = Effect.map(
      Clock.currentTimeMillis,
      (now) => now - startedAt
    );

    const draw = Effect.gen(function* () {
      const run = yield* Ref.get(latest);

      if (run !== null) {
        yield* watcher.draw(run, yield* elapsed);
      }
    });

    const read = Effect.gen(function* () {
      const run = yield* api.evals.get({ payload: { id } });

      yield* Ref.set(latest, run);
      yield* watcher.draw(run, yield* elapsed);

      return run;
    });

    const first = yield* read;

    if (!running(first)) {
      return first;
    }

    const ticking = yield* Effect.forkScoped(
      draw.pipe(Effect.delay(Duration.millis(TICK)), Effect.forever)
    );

    const watching = yield* Effect.forkScoped(
      tailRun(id, api).pipe(
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
      Effect.repeat({ until: (run: EvalRun) => !running(run) })
    );

    yield* Fiber.interrupt(ticking);
    yield* Fiber.interrupt(watching);

    return settled;
  }).pipe(
    Effect.scoped,
    Effect.timeoutFail({
      duration: Duration.seconds(timeoutSeconds),
      onTimeout: () =>
        new EvalWaitTimeout({ runId: id, seconds: timeoutSeconds }),
    }),
    Effect.withSpan("Cli.waitForRun", { attributes: { runId: id } })
  );
