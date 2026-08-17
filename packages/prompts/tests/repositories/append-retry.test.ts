import { describe, expect, it } from "bun:test";
import { PromptId } from "@anpord/schema/domain/prompts";
import { Effect, Schedule } from "effect";
import { VersionConflict } from "../../src/domain/errors";

/** Mirrors the schedule the repository appends with. Kept here rather than
 * exported so the repository states its own policy, and asserted so a change to
 * the number of attempts is a deliberate one. */
const APPEND_RETRY = Schedule.exponential("20 millis").pipe(
  Schedule.jittered,
  Schedule.compose(Schedule.recurs(3))
);

const conflict = () =>
  new VersionConflict({ promptId: PromptId.make("greeting") });

const appendThatFails = (times: number) => {
  let attempts = 0;
  const effect = Effect.suspend(() => {
    attempts += 1;
    return attempts <= times
      ? Effect.fail(conflict())
      : Effect.succeed(attempts);
  }).pipe(
    Effect.retry({
      schedule: APPEND_RETRY,
      while: (error: { _tag: string }) => error._tag === "VersionConflict",
    })
  );
  return { effect, attempts: () => attempts };
};

describe("append retry", () => {
  it("does not retry a call that succeeds", async () => {
    const { effect, attempts } = appendThatFails(0);
    await Effect.runPromise(effect);
    expect(attempts()).toBe(1);
  });

  /** The reason this exists: without a retry the loser of a race has their
   * work dropped and is told to try again by hand. */
  it("lands a write that lost one race", async () => {
    const { effect, attempts } = appendThatFails(1);
    await expect(Effect.runPromise(effect)).resolves.toBe(2);
    expect(attempts()).toBe(2);
  });

  it("keeps trying through repeated contention", async () => {
    const { effect } = appendThatFails(3);
    await expect(Effect.runPromise(effect)).resolves.toBe(4);
  });

  /** Past a few attempts the collision is not transient, and the caller is
   * better served by an error than by an unbounded wait. */
  it("gives up rather than retrying forever", async () => {
    const { effect, attempts } = appendThatFails(Number.POSITIVE_INFINITY);
    await expect(Effect.runPromise(effect)).rejects.toThrow();
    expect(attempts()).toBe(4);
  });

  it("never retries an error that is not a conflict", async () => {
    let attempts = 0;
    const effect = Effect.suspend(() => {
      attempts += 1;
      return Effect.fail({ _tag: "PromptStoreError" as const });
    }).pipe(
      Effect.retry({
        schedule: APPEND_RETRY,
        while: (error: { _tag: string }) => error._tag === "VersionConflict",
      })
    );

    await expect(Effect.runPromise(effect)).rejects.toThrow();
    expect(attempts).toBe(1);
  });
});
