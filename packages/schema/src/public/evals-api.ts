import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform";
import { Schema } from "effect";
import { BadRequest, Conflict, Forbidden, NotFound } from "../domain/errors";
import { StartBatchRequest } from "../domain/eval-definition";
import { EvalCaseId } from "../domain/eval-limits";
import { ModelCatalogue } from "../domain/eval-models";
import { MAX_RUN_TRIALS } from "../domain/eval-quota";
import { EvalBatchTail, EvalBatchTailRequest } from "../domain/eval-tail";
import {
  BatchSubscription,
  EvalBatch,
  EvalBatchPage,
  EvalHarness,
  EvalPageCursor,
  EvalRunPage,
  StartedBatch,
} from "../domain/evals";
import { HarnessEvent, HarnessUsage } from "../domain/harness-event";
import { PROFILE_HARNESS_RULE } from "../domain/harness-profile";
import { RunCaseRequest } from "../domain/run-case";
import { TrialOutcome } from "../domain/trial";
import { ApiKeyAuthentication } from "./authentication";

export const EvalBatchRequest = Schema.Struct({
  id: Schema.String,
}).annotations({
  description: "Select a batch by id.",
  identifier: "EvalBatchRequest",
});

export const EvalModelsRequest = Schema.Struct({
  harness: EvalHarness,
  q: Schema.optional(Schema.String),
}).annotations({
  description: "Select a harness whose available models should be listed.",
  identifier: "EvalModelsRequest",
});

export const ListBatchesRequest = Schema.Struct({
  cursor: Schema.optional(Schema.NullOr(EvalPageCursor)),
  limit: Schema.optional(Schema.Int),
}).annotations({
  description: "Where to read from, and how much.",
  identifier: "ListBatchesRequest",
});

export const PublicStartBatchRequest = StartBatchRequest.pipe(
  Schema.filter(
    (request) =>
      request.local ||
      request.variants.every((variant) => variant.sandbox !== "local"),
    {
      message: () =>
        "The local sandbox is only for batches the caller runs itself.",
    }
  ),
  Schema.filter(
    (request) =>
      request.cases.every(
        (subject) => !(subject.validator !== null && subject.verify !== null)
      ),
    { message: () => "Use either validator or verify, not both." }
  )
).annotations({
  description: `Start a batch with at most ${MAX_RUN_TRIALS} total case, variant, and trial combinations.`,
  identifier: "PublicStartBatchRequest",
});

export const CaseRunsRequest = Schema.Struct({
  caseId: EvalCaseId,
  page: Schema.optional(Schema.Int),
  variant: Schema.optional(Schema.String),
}).annotations({
  description: "Select a case, and optionally one of its variants.",
  identifier: "CaseRunsRequest",
});

export const PublicRunCaseRequest = Schema.extend(
  Schema.Struct({ caseId: EvalCaseId }),
  RunCaseRequest
).annotations({ identifier: "PublicRunCaseRequest" });

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

export class PublicEvalsGroup extends HttpApiGroup.make("evals")
  .add(
    HttpApiEndpoint.post("list", "/evals.list")
      .setPayload(ListBatchesRequest)
      .addSuccess(EvalBatchPage)
      .annotate(OpenApi.Summary, "List batches")
      .annotate(
        OpenApi.Description,
        "Newest first. Pass the `next` cursor from a response to read the page after it; a null `next` means there are no more."
      )
  )
  .add(
    HttpApiEndpoint.post("start", "/evals.start")
      .setPayload(PublicStartBatchRequest)
      .addSuccess(StartedBatch)
      .annotate(OpenApi.Summary, "Run a suite")
      .annotate(
        OpenApi.Description,
        `Starts one run per case and variant, and returns the batch while trials continue in the background. ${PROFILE_HARNESS_RULE}`
      )
  )
  .add(
    HttpApiEndpoint.post("runCase", "/evals.runCase")
      .setPayload(PublicRunCaseRequest)
      .addSuccess(StartedBatch)
      .annotate(OpenApi.Summary, "Run a case again")
      .annotate(
        OpenApi.Description,
        "Runs the case's newest version on one of its variants, or on every variant when none is named, so they can be compared."
      )
  )
  .add(
    HttpApiEndpoint.post("get", "/evals.get")
      .setPayload(EvalBatchRequest)
      .addSuccess(EvalBatch)
      .annotate(OpenApi.Summary, "Get a batch")
  )
  .add(
    HttpApiEndpoint.post("caseRuns", "/evals.caseRuns")
      .setPayload(CaseRunsRequest)
      .addSuccess(EvalRunPage)
      .annotate(OpenApi.Summary, "List a case's runs")
      .annotate(OpenApi.Description, "Newest first, 20 to a page.")
  )
  .add(
    HttpApiEndpoint.post("subscription", "/evals.subscription")
      .setPayload(EvalBatchRequest)
      .addSuccess(BatchSubscription)
      .annotate(OpenApi.Summary, "Watch a batch as it moves")
      .annotate(
        OpenApi.Description,
        "Returns a read-only token scoped to this batch, for following it in real time. Short-lived: request another when it expires."
      )
  )
  .add(
    HttpApiEndpoint.post("tail", "/evals.tail")
      .setPayload(EvalBatchTailRequest)
      .addSuccess(EvalBatchTail)
      .annotate(OpenApi.Exclude, true)
  )
  .add(
    HttpApiEndpoint.post("credentials", "/evals.credentials")
      .setPayload(CredentialLeaseRequest)
      .addSuccess(CredentialLease)
      .annotate(OpenApi.Summary, "Lease the credentials a local batch needs")
      .annotate(
        OpenApi.Description,
        "For a batch started with local, so the machine running it holds no credentials of its own. Returns the organization credential for one harness, expiring in minutes."
      )
  )
  .add(
    HttpApiEndpoint.post("reportTrial", "/evals.reportTrial")
      .setPayload(ReportedTrial)
      .addSuccess(Schema.Void)
      .annotate(OpenApi.Summary, "Report a trial the caller ran")
  )
  .add(
    HttpApiEndpoint.post("finish", "/evals.finish")
      .setPayload(EvalBatchRequest)
      .addSuccess(EvalBatch)
      .annotate(OpenApi.Summary, "Settle a batch whose trials the caller ran")
  )
  .add(
    HttpApiEndpoint.post("models", "/evals.models")
      .setPayload(EvalModelsRequest)
      .addSuccess(ModelCatalogue)
      .annotate(OpenApi.Summary, "List models available to the harness")
  )
  .addError(BadRequest)
  .addError(Conflict)
  .addError(Forbidden)
  .addError(NotFound)
  .middleware(ApiKeyAuthentication)
  .annotate(OpenApi.Title, "Evals")
  .annotate(
    OpenApi.Description,
    "Run the cases of a suite on harness, model and sandbox variants, and compare the runs."
  ) {}
