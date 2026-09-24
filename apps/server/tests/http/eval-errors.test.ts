import { describe, expect, it } from "bun:test";
import { CredentialError } from "@anpord/eval/credentials/errors";
import {
  EvalNotFound,
  EvalStoreError,
  NotRunnable,
  StartRefused,
} from "@anpord/eval/domain/errors";
import { BadRequest, Conflict, NotFound } from "@anpord/schema/domain/errors";
import { Cause, Effect, Exit, Logger, LogLevel, Option } from "effect";
import { withEvalErrors } from "../../src/http/eval-errors";

const mapped = (
  error:
    | CredentialError
    | EvalNotFound
    | EvalStoreError
    | NotRunnable
    | StartRefused
) =>
  Effect.runSyncExit(
    withEvalErrors(Effect.fail(error)).pipe(
      Logger.withMinimumLogLevel(LogLevel.None)
    )
  );

const failureOf = (exit: Exit.Exit<unknown, unknown>) =>
  Exit.isFailure(exit)
    ? Option.getOrNull(Cause.failureOption(exit.cause))
    : null;

const defectOf = (exit: Exit.Exit<unknown, unknown>) =>
  Exit.isFailure(exit) ? Option.getOrNull(Cause.dieOption(exit.cause)) : null;

describe("eval errors over http", () => {
  it("answers a missing batch, run, case or trial with not found", () => {
    const failure = failureOf(
      mapped(new EvalNotFound({ entity: "run", id: "run_1" }))
    );

    expect(failure).toBeInstanceOf(NotFound);
    expect((failure as NotFound).message).toContain("run_1");
  });

  it("answers work that cannot run with a conflict naming every problem", () => {
    const failure = failureOf(
      mapped(
        new NotRunnable({
          id: "bat_1",
          problems: ["this batch has no runs", "it is already running"],
        })
      )
    );

    expect(failure).toEqual(
      new Conflict({
        message: "this batch has no runs; it is already running",
      })
    );
  });

  it("answers a refusal worth retrying with a conflict", () => {
    const failure = failureOf(
      mapped(new StartRefused({ reason: "too many batches", retryable: true }))
    );

    expect(failure).toEqual(new Conflict({ message: "too many batches" }));
  });

  it("answers a refusal that will not change with a bad request", () => {
    const failure = failureOf(
      mapped(
        new StartRefused({
          reason: "Each variant must be different.",
          retryable: false,
        })
      )
    );

    expect(failure).toEqual(
      new BadRequest({ message: "Each variant must be different." })
    );
  });

  it("answers a missing credential with a bad request", () => {
    const failure = failureOf(
      mapped(
        new CredentialError({
          code: "not-found",
          message: "No credential configured for claude",
        })
      )
    );

    expect(failure).toEqual(
      new BadRequest({ message: "No credential configured for claude" })
    );
  });

  it("does not turn a broken credential store into a client error", () => {
    const error = new CredentialError({
      code: "internal",
      message: "Credential store is unavailable",
    });
    const exit = mapped(error);

    expect(failureOf(exit)).toBeNull();
    expect(defectOf(exit)).toBe(error);
  });

  it("does not turn a store failure into a client error", () => {
    const error = new EvalStoreError({
      cause: new Error("connection reset"),
      operation: "batch.insert",
    });
    const exit = mapped(error);

    expect(failureOf(exit)).toBeNull();
    expect(defectOf(exit)).toBe(error);
  });

  it("passes a success through untouched", () => {
    expect(Effect.runSync(withEvalErrors(Effect.succeed(7)))).toBe(7);
  });
});
