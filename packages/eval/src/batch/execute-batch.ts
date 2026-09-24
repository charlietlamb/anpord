import { Clock, Effect, Either, Option } from "effect";
import { SourceTokens } from "../codebase/source-token";
import { CredentialError } from "../credentials/errors";
import { CredentialResolver } from "../credentials/resolver";
import { KEYLESS_HARNESSES, unkeyed } from "../credentials/variants";
import { describeFailure, NotRunnable } from "../domain/errors";
import { ModelPrices } from "../ports/model-source";
import { SimulatedUser } from "../ports/simulated-user";
import { activeTrialsQuery } from "../repositories/active-trials-query";
import { batchPlanQuery, type RunPlan } from "../repositories/batch-plan-query";
import { BatchRepository } from "../repositories/batch-repository";
import { makeRunTrial, type TrialCredentials } from "./trial";

const RUNS_AT_ONCE = 8;

export const makeExecuteBatch = Effect.gen(function* () {
  const batches = yield* BatchRepository;
  const credentials = yield* CredentialResolver;
  const human = yield* SimulatedUser;
  const plans = yield* batchPlanQuery;
  const active = yield* activeTrialsQuery;
  const prices = yield* ModelPrices;
  const runTrial = yield* makeRunTrial;
  const sourceTokens = yield* SourceTokens;

  const credentialsFor = (organizationId: string, plan: RunPlan) =>
    Effect.gen(function* () {
      const bound = (connectionId: string) =>
        credentials.resolveBound({ connectionId, organizationId });

      if (
        plan.harnessCredentialConnectionId === null &&
        !KEYLESS_HARNESSES.has(plan.harness)
      ) {
        return yield* new CredentialError({
          code: "not-found",
          message: `No credential is bound to ${plan.harness}`,
        });
      }

      const harness =
        plan.harnessCredentialConnectionId === null
          ? unkeyed()
          : yield* bound(plan.harnessCredentialConnectionId);

      const sandbox =
        plan.sandboxCredentialConnectionId === null
          ? undefined
          : yield* bound(plan.sandboxCredentialConnectionId);

      return { harness, sandbox } satisfies TrialCredentials;
    });

  const runOne = (
    organizationId: string,
    plan: RunPlan,
    sourceToken: Parameters<typeof runTrial>[0]["sourceToken"]
  ) =>
    Effect.gen(function* () {
      const bound = yield* credentialsFor(organizationId, plan);

      const outcomes = yield* Effect.all(
        Array.from({ length: plan.trialCount }, (_, index) =>
          runTrial({
            credentials: bound,
            ordinal: index + 1,
            organizationId,
            plan,
            sourceToken,
          })
        ),
        { concurrency: plan.trialCount, mode: "either" }
      );

      const failures = outcomes.flatMap((outcome) =>
        Either.isLeft(outcome) ? [outcome.left] : []
      );
      const first = failures[0];

      if (first !== undefined && failures.length === outcomes.length) {
        return yield* Effect.fail(first);
      }
    }).pipe(
      Effect.onExit((exit) =>
        Clock.currentTimeMillis.pipe(
          Effect.flatMap((finishedAt) =>
            batches.settleRun({
              finishedAt: new Date(finishedAt),
              internalId: plan.internalId,
              status: exit._tag === "Success" ? "finished" : "failed",
            })
          ),
          Effect.ignoreLogged
        )
      ),
      Effect.withSpan("Batches.run", {
        attributes: {
          harness: plan.harness,
          runId: plan.internalId,
          sandbox: plan.sandbox,
          trials: plan.trialCount,
        },
      })
    );

  return (batchInternalId: string) =>
    Effect.gen(function* () {
      const found = yield* plans(batchInternalId);

      if (Option.isNone(found)) {
        return yield* new NotRunnable({
          id: batchInternalId,
          problems: ["that batch has no runs"],
        });
      }

      const plan = found.value;

      if ((yield* active(batchInternalId)) > 0) {
        return yield* new NotRunnable({
          id: batchInternalId,
          problems: ["that batch is already being worked on"],
        });
      }

      yield* batches.reopen(batchInternalId);

      const sourceToken = Option.getOrUndefined(
        yield* sourceTokens.forOrganization(plan.organizationId)
      );

      const outcomes = yield* Effect.forEach(
        plan.runs,
        (run) => Effect.either(runOne(plan.organizationId, run, sourceToken)),
        { concurrency: RUNS_AT_ONCE }
      );

      const failures = outcomes.flatMap((outcome) =>
        Either.isLeft(outcome) ? [outcome.left] : []
      );
      const first = failures[0];

      yield* batches.finish({
        failure:
          first === undefined
            ? null
            : `${failures.length} of ${outcomes.length} runs could not run: ${describeFailure(first)}`,
        finishedAt: new Date(yield* Clock.currentTimeMillis),
        internalId: batchInternalId,
        status: first === undefined ? "finished" : "failed",
      });

      return plan.runs.length;
    }).pipe(
      Effect.provideService(ModelPrices, prices),
      Effect.provideService(SimulatedUser, human),
      Effect.tapErrorCause((cause) =>
        Clock.currentTimeMillis.pipe(
          Effect.flatMap((finishedAt) =>
            batches.finish({
              failure: `The batch could not run: ${describeFailure(cause)}`,
              finishedAt: new Date(finishedAt),
              internalId: batchInternalId,
              status: "failed",
            })
          ),
          Effect.ignoreLogged
        )
      ),
      Effect.withSpan("Batches.execute", {
        attributes: { batchId: batchInternalId },
      }),
      Effect.annotateLogs({ batchId: batchInternalId })
    );
});
