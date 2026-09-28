import type { Actor } from "@anpord/schema/domain/actor";
import type { StartBatchRequest } from "@anpord/schema/domain/eval-definition";
import type { RerunPlan } from "@anpord/schema/domain/eval-rerun";
import type { EvalHarness } from "@anpord/schema/domain/eval-trial";
import type { StartedBatch } from "@anpord/schema/domain/evals";
import type {
  CredentialLease,
  IdempotencyKey,
  ReportedTrial,
} from "@anpord/schema/public/runner-api";
import { Context, Effect, Layer } from "effect";
import type { CredentialError } from "../credentials/errors";
import type {
  EvalNotFound,
  EvalStoreError,
  NotRunnable,
  StartRefused,
} from "../domain/errors";
import { makeExecuteBatch } from "./execute-batch";
import { makeLaunch } from "./launch";
import { makeReport } from "./report";
import { makeRerunPlan, type RerunPlanInput } from "./rerun-plan";
import { makeRerunSuite, type RerunSuite } from "./rerun-suite";
import { makeRunCase, type RunCase } from "./run-case";
import { makeStartBatch, type Start } from "./start-batch";

export interface BatchesShape {
  readonly beat: (
    organizationId: string,
    batchId: string
  ) => Effect.Effect<void, EvalNotFound | NotRunnable>;
  readonly execute: (
    batchInternalId: string
  ) => Effect.Effect<number, CredentialError | EvalStoreError | NotRunnable>;
  readonly finish: (
    organizationId: string,
    batchId: string
  ) => Effect.Effect<void, EvalNotFound | NotRunnable>;
  readonly lease: (
    actor: Actor,
    batchId: string,
    harness: EvalHarness
  ) => Effect.Effect<
    CredentialLease,
    CredentialError | EvalNotFound | NotRunnable
  >;
  readonly planRerun: (
    input: RerunPlanInput
  ) => Effect.Effect<RerunPlan, EvalNotFound>;
  readonly report: (
    organizationId: string,
    trial: ReportedTrial
  ) => Effect.Effect<void, EvalNotFound | NotRunnable>;
  readonly rerunSuite: (
    input: RerunSuite
  ) => Effect.Effect<
    StartedBatch,
    CredentialError | EvalNotFound | StartRefused
  >;
  readonly runCase: (
    input: RunCase
  ) => Effect.Effect<
    StartedBatch,
    CredentialError | EvalNotFound | NotRunnable
  >;
  readonly start: (
    actor: Actor,
    request: StartBatchRequest
  ) => Effect.Effect<StartedBatch, CredentialError | StartRefused>;
  readonly startOnce: (
    actor: Actor,
    request: StartBatchRequest,
    idempotencyKey: IdempotencyKey
  ) => Effect.Effect<Start, CredentialError | StartRefused>;
}

export class Batches extends Context.Tag("@anpord/eval/Batches")<
  Batches,
  BatchesShape
>() {}

export const BatchesLive = Layer.effect(
  Batches,
  Effect.gen(function* () {
    const execute = yield* makeExecuteBatch;
    const launch = yield* makeLaunch(execute);
    const start = yield* makeStartBatch(launch);
    const runCase = yield* makeRunCase(launch);
    const planned = yield* makeRerunPlan;
    const rerunSuite = yield* makeRerunSuite(planned, launch);
    const reporting = yield* makeReport;

    return Batches.of({
      beat: reporting.beat,
      execute,
      finish: reporting.finish,
      lease: reporting.lease,
      planRerun: (input) =>
        planned(input).pipe(Effect.map((ready) => ready.plan)),
      report: reporting.report,
      rerunSuite,
      runCase,
      start: (actor, request) =>
        start(actor, request, null).pipe(
          Effect.map((outcome) => outcome.started)
        ),
      startOnce: start,
    });
  })
);
