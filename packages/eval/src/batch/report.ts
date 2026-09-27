import type { Actor } from "@anpord/schema/domain/actor";
import type { EvalHarness } from "@anpord/schema/domain/eval-trial";
import type { ReportedTrial } from "@anpord/schema/public/runner-api";
import { Clock, DateTime, Effect, Option, Redacted } from "effect";
import { credentialIntegrations } from "../credentials/integrations";
import { CredentialResolver } from "../credentials/resolver";
import { EvalNotFound, NotRunnable } from "../domain/errors";
import { batchPlanQuery } from "../repositories/batch-plan-query";
import { BatchRepository } from "../repositories/batch-repository";
import { batchScopeQuery } from "../repositories/batch-scope-query";
import { TrialCostRepository } from "../repositories/trial-cost-repository";
import { TrialRecorder } from "../repositories/trial-record";
import { makeTrialPricing } from "./trial-pricing";

const LEASE_MILLIS = 15 * 60_000;

const closed = (id: string, status: string) =>
  new NotRunnable({
    id,
    problems: [
      status === "finished"
        ? "This run already finished, so it no longer takes results. Run the eval again."
        : "Anpord closed this run after it stopped hearing from this machine, so it no longer takes results. Run the eval again.",
    ],
  });

export const makeReport = Effect.gen(function* () {
  const batches = yield* BatchRepository;
  const recorder = yield* TrialRecorder;
  const scope = yield* batchScopeQuery;
  const credentials = yield* CredentialResolver;
  const plans = yield* batchPlanQuery;
  const price = yield* makeTrialPricing;
  const costs = yield* TrialCostRepository;

  const authMethodOf = (organizationId: string, connectionId: string | null) =>
    connectionId === null
      ? Effect.succeed(null)
      : credentials.resolveBound({ connectionId, organizationId }).pipe(
          Effect.map((credential) => Redacted.value(credential).authMethodId),
          Effect.orElseSucceed(() => null)
        );

  const localBatch = (organizationId: string, batchId: string) =>
    Effect.gen(function* () {
      const found = yield* scope
        .batch(organizationId, batchId)
        .pipe(Effect.orDie);
      if (Option.isNone(found)) {
        return yield* new EvalNotFound({ entity: "batch", id: batchId });
      }
      if (!found.value.local) {
        return yield* new NotRunnable({
          id: batchId,
          problems: [
            "this batch runs on the platform, so its trials are not reported",
          ],
        });
      }
      return found.value;
    });

  const report = (organizationId: string, trial: ReportedTrial) =>
    Effect.gen(function* () {
      const found = yield* scope
        .run(organizationId, trial.runId)
        .pipe(Effect.orDie);
      if (Option.isNone(found)) {
        return yield* new EvalNotFound({ entity: "run", id: trial.runId });
      }
      if (!found.value.local) {
        return yield* new NotRunnable({
          id: trial.runId,
          problems: [
            "this run is on the platform, so its trials are not reported",
          ],
        });
      }
      if (found.value.status !== "running") {
        return yield* closed(found.value.batchInternalId, found.value.status);
      }

      const plan = Option.flatMap(
        yield* plans(found.value.batchInternalId, trial.runId),
        ({ runs }) =>
          Option.fromNullable(
            runs.find(({ internalId }) => internalId === trial.runId)
          )
      );
      if (Option.isNone(plan)) {
        return yield* new EvalNotFound({ entity: "run", id: trial.runId });
      }

      const { trialInternalId } = yield* recorder.open({
        ordinal: trial.ordinal,
        runInternalId: trial.runId,
        startedAt: new Date(yield* Clock.currentTimeMillis),
      });
      yield* recorder.append({
        events: trial.events,
        from: 0,
        trialInternalId,
      });
      const finishedAt = new Date(yield* Clock.currentTimeMillis);

      if ("failure" in trial) {
        return yield* recorder.abandon({
          failure: trial.failure,
          finishedAt,
          trialInternalId,
        });
      }

      const { components, usage } = yield* price({
        authMethodId: yield* authMethodOf(
          organizationId,
          plan.value.harnessCredentialConnectionId
        ),
        harness: plan.value.harness,
        hasOwnSandboxCredential:
          plan.value.sandboxCredentialConnectionId !== null,
        model: plan.value.model,
        outcome: trial.outcome,
        provider: plan.value.sandbox,
        usage: trial.usage,
        userSpend: Option.fromNullable(trial.userSpend),
      });
      yield* recorder.settle({
        finishedAt,
        outcome: trial.outcome,
        sandboxId: trial.sandboxId,
        trialInternalId,
        usage,
      });
      yield* costs
        .record({ components, trialInternalId })
        .pipe(Effect.ignoreLogged);
    }).pipe(
      Effect.catchTag("EvalStoreError", Effect.die),
      Effect.withSpan("Batches.report", {
        attributes: { ordinal: trial.ordinal, runId: trial.runId },
      })
    );

  const finish = (organizationId: string, batchId: string) =>
    Effect.gen(function* () {
      const found = yield* localBatch(organizationId, batchId);
      if (found.status === "finished") {
        return;
      }
      if (found.status !== "running") {
        return yield* closed(batchId, found.status);
      }
      const finishedAt = new Date(yield* Clock.currentTimeMillis);
      yield* batches.settleOpenRuns({ batchInternalId: batchId, finishedAt });
      yield* batches.finish({
        failure: null,
        finishedAt,
        internalId: batchId,
        status: "finished",
      });
    }).pipe(
      Effect.catchTag("EvalStoreError", Effect.die),
      Effect.withSpan("Batches.finish", { attributes: { batchId } })
    );

  const beat = (organizationId: string, batchId: string) =>
    Effect.gen(function* () {
      const found = yield* localBatch(organizationId, batchId);
      if (found.status !== "running") {
        return yield* closed(batchId, found.status);
      }
      yield* batches.touch({
        internalId: batchId,
        seenAt: new Date(yield* Clock.currentTimeMillis),
      });
    }).pipe(
      Effect.catchTag("EvalStoreError", Effect.die),
      Effect.withSpan("Batches.beat", { attributes: { batchId } })
    );

  const lease = (actor: Actor, batchId: string, harness: EvalHarness) =>
    Effect.gen(function* () {
      yield* localBatch(actor.organizationId, batchId);

      const category = credentialIntegrations.find(
        ({ id }) => id === harness
      )?.category;
      if (category !== "harness" && category !== "model") {
        return yield* new NotRunnable({
          id: batchId,
          problems: [`credentials for ${harness} are not leased to a caller`],
        });
      }

      const credential = yield* credentials.resolve({
        actor,
        integrationId: harness,
      });
      const now = yield* Clock.currentTimeMillis;

      return {
        expiresAt: DateTime.unsafeMake(now + LEASE_MILLIS),
        values: Redacted.value(credential).values,
      };
    }).pipe(
      Effect.withSpan("Batches.lease", { attributes: { batchId, harness } }),
      Effect.annotateLogs({ batchId, harness })
    );

  return { beat, finish, lease, localBatch, report };
});
