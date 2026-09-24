import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform";
import { Schema } from "effect";
import { BadRequest, Conflict, Forbidden, NotFound } from "../domain/errors";
import { StartBatchRequest } from "../domain/eval-definition";
import { EvalBatchTail, EvalBatchTailRequest } from "../domain/eval-tail";
import {
  BatchSubscription,
  EvalBatch,
  EvalHarness,
  StartedBatch,
} from "../domain/evals";
import { HarnessEvent, HarnessUsage } from "../domain/harness-event";
import { TrialOutcome } from "../domain/trial";
import { ApiKeyAuthentication } from "./authentication";
import { ById, hasOneCheckPerCase, ONE_CHECK_PER_CASE } from "./evals-api";

export const CredentialLeaseRequest = Schema.Struct({
  harness: EvalHarness,
  id: Schema.String,
}).annotations({
  description:
    "Ask for the credentials a batch the caller is executing needs, for the harness it names.",
  identifier: "CredentialLeaseRequest",
});
export type CredentialLeaseRequest = typeof CredentialLeaseRequest.Type;

export const CredentialLease = Schema.Struct({
  expiresAt: Schema.DateTimeUtc,
  values: Schema.Record({ key: Schema.String, value: Schema.String }),
}).annotations({
  description:
    "Credentials for one batch, held in memory and never written down. Short-lived: start another batch rather than keeping these.",
  identifier: "CredentialLease",
});
export type CredentialLease = typeof CredentialLease.Type;

export const ReportedTrial = Schema.Struct({
  events: Schema.Array(HarnessEvent),
  ordinal: Schema.Int.pipe(Schema.positive()),
  outcome: TrialOutcome,
  runId: Schema.String,
  sandboxId: Schema.optionalWith(Schema.NullOr(Schema.String), {
    default: () => null,
  }),
  usage: Schema.optionalWith(Schema.NullOr(HarnessUsage), {
    default: () => null,
  }),
}).annotations({
  description: "One trial a client ran and is reporting the result of.",
  identifier: "ReportedTrial",
});
export type ReportedTrial = typeof ReportedTrial.Type;

export const RunnerBatchRequest = StartBatchRequest.pipe(
  Schema.filter(
    (request) =>
      request.local ||
      request.variants.every((variant) => variant.sandbox !== "local"),
    {
      message: () =>
        "The local sandbox is only for batches the caller runs itself.",
    }
  ),
  Schema.filter(hasOneCheckPerCase, ONE_CHECK_PER_CASE)
).annotations({ identifier: "RunnerBatchRequest" });

export class RunnerGroup extends HttpApiGroup.make("runner")
  .add(
    HttpApiEndpoint.post("start", "/runner.start")
      .setPayload(RunnerBatchRequest)
      .addSuccess(StartedBatch)
  )
  .add(
    HttpApiEndpoint.post("lease", "/runner.lease")
      .setPayload(CredentialLeaseRequest)
      .addSuccess(CredentialLease)
  )
  .add(
    HttpApiEndpoint.post("report", "/runner.report")
      .setPayload(ReportedTrial)
      .addSuccess(Schema.Void)
  )
  .add(
    HttpApiEndpoint.post("finish", "/runner.finish")
      .setPayload(ById)
      .addSuccess(EvalBatch)
  )
  .add(
    HttpApiEndpoint.post("subscribe", "/runner.subscribe")
      .setPayload(ById)
      .addSuccess(BatchSubscription)
  )
  .add(
    HttpApiEndpoint.post("tail", "/runner.tail")
      .setPayload(EvalBatchTailRequest)
      .addSuccess(EvalBatchTail)
  )
  .addError(BadRequest)
  .addError(Conflict)
  .addError(Forbidden)
  .addError(NotFound)
  .middleware(ApiKeyAuthentication)
  .annotate(OpenApi.Exclude, true) {}
