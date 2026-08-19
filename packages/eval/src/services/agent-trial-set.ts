import { Context, Effect, Layer } from "effect";
import { type Distribution, distributionOf } from "../domain/distribution";
import type { HarnessUnavailable, SandboxUnavailable } from "../domain/errors";
import type { TrialOutcome } from "../domain/trial";
import type { SandboxProvider } from "../ports/sandbox";
import { AgentTrial, type AgentTrialRequest } from "./agent-trial";

export interface AgentTrialSetRequest extends AgentTrialRequest {
  readonly concurrency: number;
  readonly trials: number;
}

export interface AgentTrialSetResult {
  readonly commandSpread: readonly number[];
  readonly distribution: Distribution;
  readonly outcomes: readonly TrialOutcome[];
  readonly sandboxIds: readonly string[];
}

export interface AgentTrialSetShape {
  readonly run: (
    request: AgentTrialSetRequest
  ) => Effect.Effect<
    AgentTrialSetResult,
    HarnessUnavailable | SandboxUnavailable,
    SandboxProvider
  >;
}

export class AgentTrialSet extends Context.Tag("@anpord/eval/AgentTrialSet")<
  AgentTrialSet,
  AgentTrialSetShape
>() {}

export const AgentTrialSetLive = Layer.effect(
  AgentTrialSet,
  Effect.gen(function* () {
    const trial = yield* AgentTrial;

    const run = (request: AgentTrialSetRequest) =>
      Effect.gen(function* () {
        /* Agent runs are independent and each gets its own sandbox, never a
           shared one: state carried between trials invalidates the comparison
           silently, which is worse than a crash because nothing reports it. */
        const results = yield* Effect.all(
          Array.from({ length: request.trials }, () => trial.run(request)),
          { concurrency: request.concurrency }
        );

        const outcomes = results.map((result) => result.outcome);

        return {
          /* The spread is the finding a single run cannot show. Ten of ten in
             nine to eleven commands is a deterministic cell; seven of ten in
             nine to forty-one is not, and a pass rate alone calls them the
             same thing. */
          commandSpread: results.map((result) => result.commands),
          distribution: distributionOf(outcomes),
          outcomes,
          sandboxIds: results.map((result) => result.sandboxId),
        } satisfies AgentTrialSetResult;
      }).pipe(
        Effect.withSpan("AgentTrialSet.run", {
          attributes: {
            harness: request.harness,
            model: request.model,
            provider: request.provider,
            trials: request.trials,
          },
        })
      );

    return AgentTrialSet.of({ run });
  })
);
