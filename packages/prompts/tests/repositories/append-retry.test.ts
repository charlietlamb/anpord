import { describe, expect, it } from "bun:test";
import { PromptId } from "@sphynx/schema/domain/prompts";
import { Effect } from "effect";
import { VersionConflict } from "../../src/domain/errors";
import { APPEND_RETRY } from "../../src/repositories/prompt-version-repository";

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

  it("lands a write that lost one race", async () => {
    const { effect, attempts } = appendThatFails(1);
    await expect(Effect.runPromise(effect)).resolves.toBe(2);
    expect(attempts()).toBe(2);
  });

  it("keeps trying through repeated contention", async () => {
    const { effect } = appendThatFails(3);
    await expect(Effect.runPromise(effect)).resolves.toBe(4);
  });

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
