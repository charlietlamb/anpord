import { Context, Effect, Layer } from "effect";
import type { ProviderName } from "../domain/cell";
import { type Distribution, distributionOf } from "../domain/distribution";
import type { SandboxUnavailable } from "../domain/errors";
import type { TrialOutcome } from "../domain/trial";
import { TrialRunner } from "../services/trial-runner";

export interface TrialSetRequest {
  readonly autoStopMinutes: number;
  readonly concurrency: number;
  readonly files: Readonly<Record<string, string>>;
  readonly provider: ProviderName;
  readonly setupCommand: string | null;
  readonly trials: number;
  readonly verifyCommand: string;
  readonly workspace: string;
}

export interface TrialSetResult {
  readonly distribution: Distribution;
  readonly outcomes: readonly TrialOutcome[];
}

export interface TrialSetShape {
  /** The reportable unit. One agent run is not repeatable, so a single trial
   * is never the answer: a rate over N is. */
  readonly run: (
    request: TrialSetRequest
  ) => Effect.Effect<TrialSetResult, SandboxUnavailable>;
}

export class TrialSet extends Context.Tag("@anpord/eval/TrialSet")<
  TrialSet,
  TrialSetShape
>() {}

export const TrialSetLive = Layer.effect(
  TrialSet,
  Effect.gen(function* () {
    const runner = yield* TrialRunner;

    const run = (request: TrialSetRequest) =>
      Effect.gen(function* () {
        /* Trials are independent, so they run together. The per-provider
           semaphore inside SandboxProvider is the real ceiling; this bound
           only stops the queue growing past what the caller asked for. */
        const results = yield* Effect.all(
          Array.from({ length: request.trials }, () =>
            runner.run({
              autoStopMinutes: request.autoStopMinutes,
              files: request.files,
              provider: request.provider,
              setupCommand: request.setupCommand,
              verifyCommand: request.verifyCommand,
              workspace: request.workspace,
            })
          ),
          { concurrency: request.concurrency }
        );

        const outcomes = results.map((result) => result.outcome);

        return {
          distribution: distributionOf(outcomes),
          outcomes,
        } satisfies TrialSetResult;
      }).pipe(
        Effect.withSpan("TrialSet.run", {
          attributes: {
            provider: request.provider,
            trials: request.trials,
          },
        })
      );

    return TrialSet.of({ run });
  })
);
