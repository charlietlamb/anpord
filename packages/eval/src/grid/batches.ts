import type { Actor } from "@anpord/schema/domain/actor";
import type {
  EvalHarness,
  StartBatchRequest,
  StartedBatch,
} from "@anpord/schema/domain/evals";
import type {
  CredentialLease,
  ReportedTrial,
} from "@anpord/schema/public/evals-api";
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
import { makeRunCase, type RunCase } from "./run-case";
import { makeStartBatch } from "./start-batch";

export interface BatchesShape {
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
  readonly report: (
    organizationId: string,
    trial: ReportedTrial
  ) => Effect.Effect<void, EvalNotFound | NotRunnable>;
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
    const reporting = yield* makeReport;

    return Batches.of({
      execute,
      finish: reporting.finish,
      lease: reporting.lease,
      report: reporting.report,
      runCase,
      start,
    });
  })
);
