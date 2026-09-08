import { describe, expect, it } from "bun:test";
import { HarnessUnavailable } from "./errors";
import { gaveUpOn, isTransientHarnessFailure } from "./harness-retry";

const failing = (reason: string) =>
  new HarnessUnavailable({ harness: "codex", reason });

describe("a harness failure worth waiting out", () => {
  /* Observed from the Codex CLI: the same model refused twice and answered on
     the third attempt seconds later. */
  it("waits on a provider at capacity", () => {
    expect(
      isTransientHarnessFailure(
        failing("Selected model is at capacity. Please try a different model.")
      )
    ).toBe(true);
  });

  it("waits on a rate limit", () => {
    expect(isTransientHarnessFailure(failing("429 rate limit exceeded"))).toBe(
      true
    );
  });

  /* Waiting on these spends another sandbox on the same answer. */
  it("does not wait on a model the credential cannot use", () => {
    expect(
      isTransientHarnessFailure(
        failing("The 'gpt-5-codex' model is not supported for this account.")
      )
    ).toBe(false);
  });

  it("does not wait on a spent credential", () => {
    expect(
      isTransientHarnessFailure(failing("Your refresh token was already used."))
    ).toBe(false);
  });
});

/* The waiting itself is Schedule.exponential, which Effect already covers, so
   what is worth asserting is what the caller is left holding. */
const givingUp = (reason: string) => gaveUpOn("gpt-5.5", failing(reason));

describe("giving up on a busy provider", () => {
  it("names the model and where the free ones are listed", () => {
    const failure = givingUp("Selected model is at capacity.");

    expect(failure.reason).toContain("no capacity for gpt-5.5");
    expect(failure.reason).toContain("evals.models");
  });

  it("leaves a permanent failure to speak for itself", () => {
    expect(givingUp("model is not supported").reason).toBe(
      "model is not supported"
    );
  });
});
