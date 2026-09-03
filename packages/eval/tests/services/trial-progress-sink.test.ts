import { describe, expect, it } from "bun:test";
import { Chunk, Effect, Ref, Stream } from "effect";
import { EvalStoreError } from "../../src/domain/errors";
import type { HarnessEvent } from "../../src/domain/harness-event";
import { progressSink } from "../../src/services/trial-progress-sink";

const events: readonly HarnessEvent[] = [
  { _tag: "Started", at: 1, model: "m", sessionId: "s" },
  { _tag: "Command", at: 2, command: "ls", exitCode: 0, output: "" },
  { _tag: "Command", at: 3, command: "pwd", exitCode: 0, output: "/" },
];

describe("progressSink", () => {
  it("records every batch with a running offset and loses nothing", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const seen = yield* Ref.make<readonly number[]>([]);
        const sink = yield* progressSink((_batch, from) =>
          Ref.update(seen, (all) => [...all, from])
        );

        const passed = yield* Stream.fromIterable(events).pipe(
          sink.through,
          Stream.runCollect
        );

        return {
          lost: yield* Ref.get(sink.lost),
          offsets: yield* Ref.get(seen),
          passed: Chunk.toReadonlyArray(passed),
        };
      })
    );

    expect(result.passed).toEqual(events);
    expect(result.lost).toBe(false);
    expect(result.offsets[0]).toBe(0);
  });

  /* The failure this exists to keep contained: a store that refuses every
     write used to drop the batch and say so only in a log. Now the events
     still reach the scorer, and the trial knows its journal is short. */
  it("marks the journal lost when the store refuses, and keeps going", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const sink = yield* progressSink(() =>
          Effect.fail(new EvalStoreError({ cause: "full", operation: "t" }))
        );

        const passed = yield* Stream.fromIterable(events).pipe(
          sink.through,
          Stream.runCollect
        );

        return {
          lost: yield* Ref.get(sink.lost),
          passed: Chunk.toReadonlyArray(passed),
        };
      })
    );

    expect(result.passed).toEqual(events);
    expect(result.lost).toBe(true);
  });

  it("writes nothing and loses nothing when there is nowhere to write", async () => {
    const lost = await Effect.runPromise(
      Effect.gen(function* () {
        const sink = yield* progressSink(undefined);

        yield* Stream.fromIterable(events).pipe(sink.through, Stream.runDrain);

        return yield* Ref.get(sink.lost);
      })
    );

    expect(lost).toBe(false);
  });
});
