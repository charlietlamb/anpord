import type { EvalRun } from "@anpord/schema/domain/evals";
import { AnpordApi } from "@anpord/schema/public/client";
import { Clock, Duration, Effect, Ref } from "effect";

const FIRST_POLL = 2000;
const SLOWEST_POLL = 10_000;
const WIDENING = 1.5;

const running = (run: EvalRun) => run.status === "running";

export const waitForRun = (
  id: string,
  onProgress: (run: EvalRun, elapsedMs: number) => Effect.Effect<void>
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
  }).pipe(Effect.withSpan("Cli.waitForRun", { attributes: { runId: id } }));
