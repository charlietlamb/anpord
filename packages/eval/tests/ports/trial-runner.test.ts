import { describe, expect, test } from "bun:test";
import { Effect, Ref } from "effect";
import {
  TrialRunner,
  TrialRunnerInProcess,
} from "../../src/ports/trial-runner";

describe("dispatching a batch in this process", () => {
  test("returns before the batch finishes, so starting one does not block", async () => {
    const ran = await Effect.runPromise(
      Effect.gen(function* () {
        const started = yield* Ref.make(false);
        const runner = yield* TrialRunner;

        yield* runner.dispatch({
          organizationId: "org",
          work: Effect.sleep("50 millis").pipe(
            Effect.zipRight(Ref.set(started, true))
          ),
          batchId: "ebat_1",
        });

        return yield* Ref.get(started);
      }).pipe(Effect.provide(TrialRunnerInProcess))
    );

    expect(ran).toBe(false);
  });

  test("the batch still runs once it has been dispatched", async () => {
    const ran = await Effect.runPromise(
      Effect.gen(function* () {
        const started = yield* Ref.make(false);
        const runner = yield* TrialRunner;

        yield* runner.dispatch({
          organizationId: "org",
          work: Ref.set(started, true),
          batchId: "ebat_1",
        });

        yield* Effect.sleep("50 millis");

        return yield* Ref.get(started);
      }).pipe(Effect.provide(TrialRunnerInProcess))
    );

    expect(ran).toBe(true);
  });
});
