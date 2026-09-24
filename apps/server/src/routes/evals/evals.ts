import { Batches } from "@anpord/eval/grid/batches";
import { EvalReads } from "@anpord/eval/services/eval-reads";
import { ModelCatalogues } from "@anpord/eval/services/model-catalogue";
import type { StartBatchRequest } from "@anpord/schema/domain/eval-definition";
import type { EvalTailMark } from "@anpord/schema/domain/eval-tail";
import type { EvalTrigger } from "@anpord/schema/domain/eval-trigger";
import type {
  EvalArtifactRequest,
  EvalHarness,
  EvalPageCursor,
  StartedBatch,
} from "@anpord/schema/domain/evals";
import type { RunCaseRequest } from "@anpord/schema/domain/run-case";
import { CurrentActor } from "@anpord/schema/internal/authentication";
import type { ReportedTrial } from "@anpord/schema/public/evals-api";
import { Effect } from "effect";
import { withEvalErrors } from "../../http/eval-errors";
import { mintBatchSubscription } from "./batch-subscription";
import { meterBatch } from "./meter-batch";

const trialsIn = (started: StartedBatch, trials: number) =>
  started.runs.length * trials;

const metered = (trials: number) => (started: StartedBatch) =>
  Effect.flatMap(CurrentActor, (actor) =>
    meterBatch({
      batchId: started.id,
      organizationId: actor.organizationId,
      trials: trialsIn(started, trials),
    })
  );

const organization = Effect.map(CurrentActor, (actor) => actor.organizationId);

export const startBatch = (request: StartBatchRequest) =>
  Effect.gen(function* () {
    const actor = yield* CurrentActor;
    return yield* (yield* Batches).start(actor, request);
  }).pipe(Effect.tap(metered(request.trials)), withEvalErrors);

export const runCase = (
  caseId: string,
  request: RunCaseRequest,
  options: { readonly hostedOnly: boolean; readonly trigger: EvalTrigger }
) =>
  Effect.gen(function* () {
    const actor = yield* CurrentActor;
    return yield* (yield* Batches).runCase({
      actor,
      caseId,
      hostedOnly: options.hostedOnly,
      trials: request.trials,
      trigger: options.trigger,
      variantId: request.variant ?? null,
    });
  }).pipe(Effect.tap(metered(request.trials)), withEvalErrors);

export const reportTrial = (trial: ReportedTrial) =>
  Effect.gen(function* () {
    return yield* (yield* Batches).report(yield* organization, trial);
  }).pipe(withEvalErrors);

export const finishBatch = (batchId: string) =>
  Effect.gen(function* () {
    const organizationId = yield* organization;
    yield* (yield* Batches).finish(organizationId, batchId);
    return yield* (yield* EvalReads).batch(organizationId, batchId);
  }).pipe(withEvalErrors);

export const leaseCredentials = (batchId: string, harness: EvalHarness) =>
  Effect.gen(function* () {
    const actor = yield* CurrentActor;
    return yield* (yield* Batches).lease(actor, batchId, harness);
  }).pipe(withEvalErrors);

export const readBatch = (batchId: string) =>
  Effect.gen(function* () {
    return yield* (yield* EvalReads).batch(yield* organization, batchId);
  }).pipe(withEvalErrors);

export const listBatches = (
  cursor: EvalPageCursor | null,
  limit: number | undefined
) =>
  Effect.gen(function* () {
    return yield* (yield* EvalReads).batches({
      cursor,
      limit,
      organizationId: yield* organization,
    });
  });

export const listCases = (input: {
  readonly cursor: EvalPageCursor | null;
  readonly limit: number | undefined;
  readonly suite: string | null;
  readonly tag: string | null;
}) =>
  Effect.gen(function* () {
    return yield* (yield* EvalReads).cases({
      ...input,
      organizationId: yield* organization,
    });
  });

export const readCase = (caseId: string) =>
  Effect.gen(function* () {
    return yield* (yield* EvalReads).case(yield* organization, caseId);
  }).pipe(withEvalErrors);

export const listCaseRuns = (
  caseId: string,
  page: number | undefined,
  variant: string | undefined
) =>
  Effect.gen(function* () {
    return yield* (yield* EvalReads).caseRuns({
      caseId,
      organizationId: yield* organization,
      page: page ?? 1,
      variant: variant ?? null,
    });
  });

export const readRun = (runId: string) =>
  Effect.gen(function* () {
    return yield* (yield* EvalReads).run(yield* organization, runId);
  }).pipe(withEvalErrors);

export const readTrialAddress = (trialId: string) =>
  Effect.gen(function* () {
    return yield* (yield* EvalReads).trialAddress(yield* organization, trialId);
  }).pipe(withEvalErrors);

export const readArtifact = (input: EvalArtifactRequest) =>
  Effect.gen(function* () {
    return yield* (yield* EvalReads).artifact(yield* organization, input);
  }).pipe(withEvalErrors);

export const readTail = (batchId: string, after: readonly EvalTailMark[]) =>
  Effect.gen(function* () {
    return yield* (yield* EvalReads).tail({
      after,
      batchId,
      organizationId: yield* organization,
    });
  }).pipe(withEvalErrors);

export const subscribeToBatch = (batchId: string) =>
  Effect.gen(function* () {
    yield* (yield* EvalReads).ownedBatch(yield* organization, batchId);
    return yield* mintBatchSubscription(batchId);
  }).pipe(withEvalErrors);

export const listModels = (harness: EvalHarness, query: string | undefined) =>
  Effect.flatMap(ModelCatalogues, (catalogues) =>
    catalogues.forHarness({ harness, query })
  );
