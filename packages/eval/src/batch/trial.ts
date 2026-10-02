import type { ResolvedCredential } from "@sphynx/schema/domain/credentials";
import type { EvalValidation } from "@sphynx/schema/domain/eval-validations";
import { Clock, Effect, Option, Redacted, Ref } from "effect";
import { describeCause } from "../domain/failure";
import { autoStopMinutesFor } from "../domain/sandbox-lifetime";
import { validationPlan } from "../domain/validation-plan";
import { RunBell } from "../ports/run-bell";
import type { RunPlan } from "../repositories/batch-plan-query";
import { TrialCostRepository } from "../repositories/trial-cost-repository";
import { TrialRecorder } from "../repositories/trial-record";
import { AgentTrial } from "../services/agent-trial";
import { makeTrialPricing } from "./trial-pricing";

const WORKSPACE = "/tmp/sphynx-task";

export interface TrialCredentials {
  readonly harness: Redacted.Redacted<ResolvedCredential>;
  readonly sandbox?: Redacted.Redacted<ResolvedCredential>;
}

const upsert = (
  records: readonly EvalValidation[],
  record: EvalValidation
): readonly EvalValidation[] =>
  records.some((entry) => entry.id === record.id)
    ? records.map((entry) => (entry.id === record.id ? record : entry))
    : [...records, record];

export const makeRunTrial = Effect.gen(function* () {
  const agent = yield* AgentTrial;
  const bell = yield* RunBell;
  const costs = yield* TrialCostRepository;
  const price = yield* makeTrialPricing;
  const recorder = yield* TrialRecorder;

  return (input: {
    readonly credentials: TrialCredentials;
    readonly ordinal: number;
    readonly organizationId: string;
    readonly plan: RunPlan;
    readonly sourceToken: Redacted.Redacted<string> | undefined;
  }) =>
    Effect.gen(function* () {
      const { plan } = input;
      const startedAt = yield* Clock.currentTimeMillis;

      const { priorSandboxId, trialInternalId } = yield* recorder.open({
        ordinal: input.ordinal,
        runInternalId: plan.internalId,
        startedAt: new Date(startedAt),
      });

      yield* Effect.addFinalizer((exit) =>
        exit._tag === "Success"
          ? Effect.void
          : Clock.currentTimeMillis.pipe(
              Effect.flatMap((finishedAt) =>
                recorder.abandon({
                  failure: describeCause(exit.cause),
                  finishedAt: new Date(finishedAt),
                  trialInternalId,
                })
              ),
              Effect.ignore
            )
      );

      const validations = yield* Ref.make<readonly EvalValidation[]>(
        validationPlan(plan.case.validator, plan.case.verify)
      );
      const recordValidations = (records: readonly EvalValidation[]) =>
        recorder
          .recordValidations({ trialInternalId, validations: records })
          .pipe(Effect.zipRight(bell.ring));

      yield* recordValidations(yield* Ref.get(validations));

      const result = yield* agent.run({
        autoStopMinutes: autoStopMinutesFor(plan.case.timeoutMs),
        caseCache: plan.case.cache ?? undefined,
        harness: plan.harness,
        harnessCredential: input.credentials.harness,
        harnessVersion: plan.harnessVersion,
        maxTurns: plan.case.maxTurns,
        model: plan.model,
        onSandbox: (sandboxId) =>
          Effect.ignoreLogged(recorder.attach({ sandboxId, trialInternalId })),
        onValidation: (record) =>
          Ref.updateAndGet(validations, (records) =>
            upsert(records, record)
          ).pipe(Effect.flatMap(recordValidations), Effect.orDie),
        organizationId: input.organizationId,
        prepare: plan.case.prepare,
        priorSandboxId: Option.getOrUndefined(priorSandboxId),
        profile: plan.profile,
        progress: {
          append: (events, from) =>
            recorder
              .append({ events, from, trialInternalId })
              .pipe(Effect.zipRight(bell.ring)),
        },
        prompt: plan.case.prompt,
        provider: plan.sandbox,
        sandboxCredentials:
          input.credentials.sandbox === undefined
            ? undefined
            : Redacted.make(Redacted.value(input.credentials.sandbox).values),
        source: plan.case.source,
        sourceToken: input.sourceToken,
        timeoutMs: plan.case.timeoutMs,
        user: plan.case.user,
        validator: plan.case.validator,
        verifyCommand: plan.case.verify,
        workspace: WORKSPACE,
      });

      const finishedAt = yield* Clock.currentTimeMillis;
      const { components, usage } = yield* price({
        authMethodId: Redacted.value(input.credentials.harness).authMethodId,
        harness: plan.harness,
        hasOwnSandboxCredential: input.credentials.sandbox !== undefined,
        model: plan.model,
        outcome: result.outcome,
        provider: plan.sandbox,
        usage: Option.getOrNull(result.usage),
        userSpend: result.userSpend,
      });

      yield* recorder.settle({
        artifacts: result.artifactContents,
        finishedAt: new Date(finishedAt),
        outcome: result.outcome,
        sandboxId: result.sandboxId,
        trialInternalId,
        usage,
      });

      yield* costs
        .record({ components, trialInternalId })
        .pipe(Effect.ignoreLogged);

      yield* bell.ring;

      return result.outcome.status;
    }).pipe(
      Effect.scoped,
      Effect.withSpan("Batches.trial", {
        attributes: { ordinal: input.ordinal, runId: input.plan.internalId },
      }),
      Effect.annotateLogs({
        ordinal: input.ordinal,
        runId: input.plan.internalId,
      })
    );
});
