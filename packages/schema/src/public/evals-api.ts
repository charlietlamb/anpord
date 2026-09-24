import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform";
import { Schema } from "effect";
import { BadRequest, Conflict, Forbidden, NotFound } from "../domain/errors";
import { type EvalCase, StartBatchRequest } from "../domain/eval-definition";
import { EvalCaseId } from "../domain/eval-limits";
import { ModelCatalogue } from "../domain/eval-models";
import { MAX_RUN_TRIALS } from "../domain/eval-quota";
import {
  EvalBatch,
  EvalBatchPage,
  EvalCaseDetail,
  EvalCasePage,
  EvalHarness,
  EvalPageCursor,
  EvalRun,
  EvalRunPage,
  StartedBatch,
} from "../domain/evals";
import { PROFILE_HARNESS_RULE } from "../domain/harness-profile";
import { RunCaseRequest } from "../domain/run-case";
import { ApiKeyAuthentication } from "./authentication";

export const ById = Schema.Struct({ id: Schema.String }).annotations({
  description: "Select one by id.",
  identifier: "ById",
});

const Page = {
  cursor: Schema.optional(Schema.NullOr(EvalPageCursor)),
  limit: Schema.optional(Schema.Int),
};

export const ListBatchesRequest = Schema.Struct(Page).annotations({
  description: "Where to read from, and how much.",
  identifier: "ListBatchesRequest",
});

export const ListCasesRequest = Schema.Struct({
  ...Page,
  suite: Schema.optional(Schema.String),
  tag: Schema.optional(Schema.String),
}).annotations({
  description: "Where to read from, how much, and an optional suite or tag.",
  identifier: "ListCasesRequest",
});

export const hasOneCheckPerCase = (request: {
  readonly cases: readonly EvalCase[];
}) =>
  request.cases.every(
    (subject) => !(subject.validator !== null && subject.verify !== null)
  );

export const ONE_CHECK_PER_CASE = {
  message: () => "A case has either a validator or a command, not both.",
};

export const SuiteBatchRequest = StartBatchRequest.omit("local", "trigger")
  .pipe(
    Schema.filter(
      (request) =>
        request.variants.every((variant) => variant.sandbox !== "local"),
      {
        message: () =>
          "The local sandbox runs on your machine. Start it with anpord eval --local.",
      }
    ),
    Schema.filter(hasOneCheckPerCase, ONE_CHECK_PER_CASE)
  )
  .annotations({
    description: `Every case of a suite on every variant, with at most ${MAX_RUN_TRIALS} case, variant and trial combinations.`,
    identifier: "SuiteBatchRequest",
  });

export const RunCaseBatchRequest = Schema.extend(
  Schema.Struct({ id: EvalCaseId }),
  RunCaseRequest
).annotations({ identifier: "RunCaseBatchRequest" });

export const ListRunsRequest = Schema.Struct({
  caseId: EvalCaseId,
  page: Schema.optional(Schema.Int),
  variant: Schema.optional(Schema.String),
}).annotations({
  description: "Select a case, and optionally one of its variants.",
  identifier: "ListRunsRequest",
});

export const ListModelsRequest = Schema.Struct({
  harness: EvalHarness,
  q: Schema.optional(Schema.String),
}).annotations({
  description: "Select a harness whose available models should be listed.",
  identifier: "ListModelsRequest",
});

const evalsGroup = <const Name extends string>(name: Name, title: string) =>
  HttpApiGroup.make(name)
    .addError(BadRequest)
    .addError(Conflict)
    .addError(Forbidden)
    .addError(NotFound)
    .middleware(ApiKeyAuthentication)
    .annotate(OpenApi.Title, title);

export class BatchesGroup extends evalsGroup("batches", "Batches")
  .add(
    HttpApiEndpoint.post("start", "/evals.batches.start")
      .setPayload(SuiteBatchRequest)
      .addSuccess(StartedBatch)
      .annotate(OpenApi.Summary, "Start a batch for a suite")
      .annotate(
        OpenApi.Description,
        `Starts one run per case and variant, and returns the batch while trials continue in the background. ${PROFILE_HARNESS_RULE}`
      )
  )
  .add(
    HttpApiEndpoint.post("get", "/evals.batches.get")
      .setPayload(ById)
      .addSuccess(EvalBatch)
      .annotate(OpenApi.Summary, "Get a batch")
  )
  .add(
    HttpApiEndpoint.post("list", "/evals.batches.list")
      .setPayload(ListBatchesRequest)
      .addSuccess(EvalBatchPage)
      .annotate(OpenApi.Summary, "List batches")
      .annotate(
        OpenApi.Description,
        "Newest first. Pass the `next` cursor from a response to read the page after it; a null `next` means there are no more."
      )
  )
  .annotate(
    OpenApi.Description,
    "Runs started together, such as every case of a suite on every variant."
  ) {}

export class CasesGroup extends evalsGroup("cases", "Cases")
  .add(
    HttpApiEndpoint.post("list", "/evals.cases.list")
      .setPayload(ListCasesRequest)
      .addSuccess(EvalCasePage)
      .annotate(OpenApi.Summary, "List cases")
  )
  .add(
    HttpApiEndpoint.post("get", "/evals.cases.get")
      .setPayload(ById)
      .addSuccess(EvalCaseDetail)
      .annotate(OpenApi.Summary, "Get a case, its variants and its versions")
  )
  .add(
    HttpApiEndpoint.post("run", "/evals.cases.run")
      .setPayload(RunCaseBatchRequest)
      .addSuccess(StartedBatch)
      .annotate(OpenApi.Summary, "Start a batch for a case")
      .annotate(
        OpenApi.Description,
        "Runs the case's newest version on the variants named, or on every variant it has run on, so they can be compared."
      )
  )
  .annotate(
    OpenApi.Description,
    "One eval each, belonging to a suite, run on one or more variants."
  ) {}

export class RunsGroup extends evalsGroup("runs", "Runs")
  .add(
    HttpApiEndpoint.post("list", "/evals.runs.list")
      .setPayload(ListRunsRequest)
      .addSuccess(EvalRunPage)
      .annotate(OpenApi.Summary, "List a case's runs")
      .annotate(OpenApi.Description, "Newest first, 20 to a page.")
  )
  .add(
    HttpApiEndpoint.post("get", "/evals.runs.get")
      .setPayload(ById)
      .addSuccess(EvalRun)
      .annotate(OpenApi.Summary, "Get a run and its trials")
  )
  .annotate(
    OpenApi.Description,
    "One case run on one variant, with its trials."
  ) {}

export class ModelsGroup extends evalsGroup("models", "Models")
  .add(
    HttpApiEndpoint.post("list", "/evals.models.list")
      .setPayload(ListModelsRequest)
      .addSuccess(ModelCatalogue)
      .annotate(OpenApi.Summary, "List models available to a harness")
  )
  .annotate(OpenApi.Description, "The models a variant can name.") {}
