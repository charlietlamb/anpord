import { Batches } from "@sphynx/eval/batch/batches";
import { BatchSubscriptions } from "@sphynx/eval/ports/batch-subscriptions";
import { EvalReads } from "@sphynx/eval/services/eval-reads";
import type { StartBatchRequest } from "@sphynx/schema/domain/eval-definition";
import type {
  RerunIntent,
  RerunRequest,
} from "@sphynx/schema/domain/eval-rerun";
import type { EvalHarness } from "@sphynx/schema/domain/eval-trial";
import type { EvalTrigger } from "@sphynx/schema/domain/eval-trigger";
import type { StartedBatch } from "@sphynx/schema/domain/evals";
import type { RunCaseRequest } from "@sphynx/schema/domain/run-case";
import { CurrentActor } from "@sphynx/schema/internal/authentication";
import type {
  IdempotencyKey,
  ReportedTrial,
} from "@sphynx/schema/public/runner-api";
import { Effect } from "effect";
import { withEvalErrors } from "../../http/eval-errors";
import { organization } from "./current-organization";
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

export const startBatch = (
  request: StartBatchRequest,
  idempotencyKey: IdempotencyKey | null = null
) =>
  Effect.gen(function* () {
    const actor = yield* CurrentActor;
    const batches = yield* Batches;
    if (idempotencyKey === null) {
      return yield* batches
        .start(actor, request)
        .pipe(Effect.tap(metered(request.trials)));
    }
    const { replayed, started } = yield* batches.startOnce(
      actor,
      request,
      idempotencyKey
    );
    if (!replayed) {
      yield* metered(request.trials)(started);
    }
    return started;
  }).pipe(withEvalErrors);

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
      variantIds: request.variants ?? null,
    });
  }).pipe(Effect.tap(metered(request.trials)), withEvalErrors);

export const planSuiteRerun = (suiteId: string, intent: RerunIntent) =>
  Effect.gen(function* () {
    const actor = yield* CurrentActor;
    return yield* (yield* Batches).planRerun({ actor, intent, suiteId });
  }).pipe(withEvalErrors);

export const rerunSuite = (
  suiteId: string,
  request: RerunRequest,
  trigger: EvalTrigger
) =>
  Effect.gen(function* () {
    const actor = yield* CurrentActor;
    return yield* (yield* Batches).rerunSuite({
      actor,
      request,
      suiteId,
      trigger,
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

export const beatBatch = (batchId: string) =>
  Effect.gen(function* () {
    yield* (yield* Batches).beat(yield* organization, batchId);
  }).pipe(withEvalErrors);

export const leaseCredentials = (batchId: string, harness: EvalHarness) =>
  Effect.gen(function* () {
    const actor = yield* CurrentActor;
    return yield* (yield* Batches).lease(actor, batchId, harness);
  }).pipe(withEvalErrors);

export const subscribeToBatch = (batchId: string) =>
  Effect.gen(function* () {
    yield* (yield* EvalReads).ownedBatch(yield* organization, batchId);
    return yield* (yield* BatchSubscriptions).mint(batchId);
  }).pipe(withEvalErrors);
