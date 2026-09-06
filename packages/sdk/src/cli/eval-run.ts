import type { EvalRun } from "@anpord/schema/domain/evals";
import { AnpordApi } from "@anpord/schema/public/client";
import { Clock, Data, Duration, Effect, Ref } from "effect";

const FIRST_POLL = 2000;
const SLOWEST_POLL = 10_000;
const WIDENING = 1.5;

const running = (run: EvalRun) => run.status === "running";

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
  onProgress: (run: EvalRun, elapsedMs: number) => Effect.Effect<void>,
  timeoutSeconds: number
) =>
  Effect.gen(function* () {
    const api = yield* AnpordApi;
    const startedAt = yield* Clock.currentTimeMillis;
    const gap = yield* Ref.make(FIRST_POLL);

    const poll = Effect.gen(function* () {
      const run = yield* api.evals.get({ payload: { id } });
      const elapsed = (yield* Clock.currentTimeMillis) - startedAt;

      yield* onProgress(run, elapsed);

      return run;
    });

    const waitThenPoll = Effect.gen(function* () {
      const millis = yield* Ref.getAndUpdate(gap, (current) =>
        Math.min(Math.round(current * WIDENING), SLOWEST_POLL)
      );

      yield* Effect.sleep(Duration.millis(millis));

      return yield* poll;
    });

    return yield* Effect.iterate(yield* poll, {
      body: () => waitThenPoll,
      while: running,
    });
  }).pipe(
    Effect.timeoutFail({
      duration: Duration.seconds(timeoutSeconds),
      onTimeout: () =>
        new EvalWaitTimeout({ runId: id, seconds: timeoutSeconds }),
    }),
    Effect.withSpan("Cli.waitForRun", { attributes: { runId: id } })
  );
