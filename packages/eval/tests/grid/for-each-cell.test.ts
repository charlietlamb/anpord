import { describe, expect, it } from "bun:test";
import { Effect, Either } from "effect";
import { forEachGridCell } from "../../src/grid/for-each-cell";

describe("forEachGridCell", () => {
  /* The failure this exists to keep contained: one cell the provider refused
     used to interrupt every other cell and leave the run open forever. */
  it("lets every cell end on its own and reports each outcome", async () => {
    const outcomes = await Effect.runPromise(
      forEachGridCell(["a", "b"], [1, 2], (subject, task) =>
        subject === "a" && task === 2
          ? Effect.fail(`${subject}${task} refused`)
          : Effect.succeed(`${subject}${task}`)
      )
    );

    expect(outcomes).toHaveLength(4);
    expect(outcomes.filter(Either.isRight).map((o) => o.right)).toEqual([
      "a1",
      "b1",
      "b2",
    ]);
    expect(outcomes.filter(Either.isLeft).map((o) => o.left)).toEqual([
      "a2 refused",
    ]);
  });
});
