import { describe, expect, it } from "bun:test";
import { Cause } from "effect";
import { EvalStoreError, reasonOf } from "./errors";
import { failureOf } from "./failure";

const wrapped = (...messages: readonly string[]) =>
  messages.reduceRight<Error | undefined>((cause, message) => {
    const error = new Error(message);
    if (cause) {
      (error as { cause?: unknown }).cause = cause;
    }
    return error;
  }, undefined) as Error;

describe("reading why a store operation failed", () => {
  it("follows the driver's own chain to the reason", () => {
    const error = wrapped(
      "Failed query: insert into eval_trial",
      "Cannot use a pool after calling end on the pool"
    );

    expect(reasonOf(error)).toBe(
      "Cannot use a pool after calling end on the pool"
    );
  });

  it("names the operation and the reason", () => {
    const store = new EvalStoreError({
      cause: wrapped("outer", "the pool was closed"),
      operation: "trial.open",
    });

    expect(store.message).toBe("trial.open failed: the pool was closed");
  });

  it("no longer renders as a bare occurrence", () => {
    const store = new EvalStoreError({
      cause: new Error("boom"),
      operation: "run.insert",
    });

    expect(store.message).not.toContain("An error has occurred");
  });

  it("records the reason on the run rather than a stack", () => {
    const store = new EvalStoreError({
      cause: wrapped("Failed query", "the pool was closed"),
      operation: "trial.open",
    });

    const recorded = failureOf(Cause.fail(store));

    expect(recorded).toContain("the pool was closed");
    expect(recorded).not.toContain("node_modules");
  });

  it("survives a cause that points at itself", () => {
    const looping = new Error("round");
    (looping as { cause?: unknown }).cause = looping;

    expect(reasonOf(looping)).toBe("round");
  });
});
