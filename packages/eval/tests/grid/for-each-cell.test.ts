import { describe, expect, it } from "bun:test";
import { Effect, Ref } from "effect";
import { forEachGridCell } from "../../src/grid/for-each-cell";

describe("forEachGridCell", () => {
  it("starts the complete grid concurrently", async () => {
    const active = await Effect.runPromise(Ref.make(0));
    const peak = await Effect.runPromise(Ref.make(0));
    const seen = new Set<string>();

    await Effect.runPromise(
      forEachGridCell(["a", "b"], ["x", "y"], (subject, task) =>
        Effect.gen(function* () {
          const count = yield* Ref.updateAndGet(active, (value) => value + 1);
          yield* Ref.update(peak, (value) => Math.max(value, count));
          yield* Effect.sleep("10 millis");
          seen.add(`${subject}:${task}`);
          yield* Ref.update(active, (value) => value - 1);
        })
      )
    );

    expect(seen).toEqual(new Set(["a:x", "a:y", "b:x", "b:y"]));
    expect(await Effect.runPromise(Ref.get(peak))).toBe(4);
  });
});
