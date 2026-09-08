import { describe, expect, it } from "bun:test";
import { Effect, Schedule } from "effect";
import { HarnessUnavailable } from "./errors";
import { isTransientHarnessFailure } from "./harness-retry";

const failing = (reason: string) =>
  new HarnessUnavailable({ harness: "codex", reason });

describe("a harness failure worth waiting out", () => {
  /* Observed three times in a row from the Codex CLI: the same model refused
     twice and answered on the third attempt seconds later. */
  it("retries a provider at capacity", () => {
    expect(
      isTransientHarnessFailure(
        failing("Selected model is at capacity. Please try a different model.")
      )
    ).toBe(true);
  });

  it("retries a rate limit", () => {
    expect(isTransientHarnessFailure(failing("429 rate limit exceeded"))).toBe(
      true
    );
  });

  /* Retrying these spends another sandbox on the same answer. */
  it("does not retry a model the credential cannot use", () => {
    expect(
      isTransientHarnessFailure(
        failing(
          "The 'gpt-5-codex' model is not supported with a ChatGPT account."
        )
      )
    ).toBe(false);
  });

  it("does not retry a spent credential", () => {
    expect(
      isTransientHarnessFailure(failing("Your refresh token was already used."))
    ).toBe(false);
  });
});

const FAST = Schedule.recurs(4).pipe(
  Schedule.whileInput(isTransientHarnessFailure)
);

const attemptsBefore = (reason: string, succeedOn: number) =>
  Effect.gen(function* () {
    let attempts = 0;

    yield* Effect.suspend(() => {
      attempts += 1;

      return attempts < succeedOn
        ? Effect.fail(failing(reason))
        : Effect.succeed("ran");
    }).pipe(Effect.retry(FAST), Effect.either);

    return attempts;
  });

describe("the schedule that waits one out", () => {
  it("keeps trying while the provider is at capacity", async () => {
    expect(await Effect.runPromise(attemptsBefore("at capacity", 3))).toBe(3);
  });

  it("stops rather than waiting forever", async () => {
    expect(await Effect.runPromise(attemptsBefore("at capacity", 99))).toBe(5);
  });

  it("does not retry what will not clear", async () => {
    expect(
      await Effect.runPromise(attemptsBefore("model is not supported", 99))
    ).toBe(1);
  });
});
