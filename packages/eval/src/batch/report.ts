import type { Actor } from "@anpord/schema/domain/actor";
import type { EvalHarness } from "@anpord/schema/domain/evals";
import type { ReportedTrial } from "@anpord/schema/public/runner-api";
import { Clock, DateTime, Effect, Option, Redacted } from "effect";
import { credentialIntegrations } from "../credentials/integrations";
import { CredentialResolver } from "../credentials/resolver";
import { EvalNotFound, NotRunnable } from "../domain/errors";
import { BatchRepository } from "../repositories/batch-repository";
import { batchScopeQuery } from "../repositories/batch-scope-query";
import { TrialRecorder } from "../repositories/trial-record";

const LEASE_MILLIS = 15 * 60_000;

export const makeReport = Effect.gen(function* () {
  const batches = yield* BatchRepository;
  const recorder = yield* TrialRecorder;
  const scope = yield* batchScopeQuery;
  const credentials = yield* CredentialResolver;

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
      yield* recorder.settle({
        finishedAt: new Date(yield* Clock.currentTimeMillis),
        outcome: trial.outcome,
        sandboxId: trial.sandboxId,
        trialInternalId,
        usage: trial.usage,
      });
    }).pipe(
      Effect.catchTag("EvalStoreError", Effect.die),
      Effect.withSpan("Batches.report", {
        attributes: { ordinal: trial.ordinal, runId: trial.runId },
      })
    );

  const finish = (organizationId: string, batchId: string) =>
    Effect.gen(function* () {
      yield* localBatch(organizationId, batchId);
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

  return { finish, lease, localBatch, report };
});
