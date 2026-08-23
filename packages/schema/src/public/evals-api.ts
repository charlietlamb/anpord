import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform";
import { Schema } from "effect";
import { BadRequest, Conflict, Forbidden, NotFound } from "../domain/errors";
import {
  EvalCellHistoryEntry,
  EvalHarness,
  EvalPageCursor,
  EvalRun,
  EvalRunPage,
  EvalSource,
  HostedEvalProvider,
  ModelCatalogue,
  RerunCellRequest,
  StartedEval,
} from "../domain/evals";
import { ApiKeyAuthentication } from "./authentication";

export const EvalRunRequest = Schema.Struct({ id: Schema.String }).annotations({
  description: "Select an eval run by id.",
  identifier: "EvalRunRequest",
});
export const EvalCellRequest = Schema.Struct({
  cellKey: Schema.String,
}).annotations({
  description: "Select an eval cell by its stable key.",
  identifier: "EvalCellRequest",
});
export const EvalModelsRequest = Schema.Struct({
  harness: EvalHarness,
  /** Narrows to models whose id or name contains this. */
  q: Schema.optional(Schema.String),
}).annotations({
  description: "Select a harness whose available models should be listed.",
  identifier: "EvalModelsRequest",
});
const PublicEvalProvider = HostedEvalProvider.annotations({
  description: "A hosted sandbox provider.",
  identifier: "PublicEvalProvider",
});
export const ListEvalsRequest = Schema.Struct({
  cursor: Schema.optional(Schema.NullOr(EvalPageCursor)),
  limit: Schema.optional(Schema.Int),
}).annotations({
  description: "Where to read from, and how much.",
  identifier: "ListEvalsRequest",
});

const PublicEvalCase = Schema.Struct({
  goal: Schema.String,
  name: Schema.String,
  setup: Schema.optional(Schema.NullOr(Schema.String)),
  source: Schema.optional(EvalSource),
  verify: Schema.NullOr(Schema.String),
}).annotations({
  description: "A task, workspace source, setup command, and verifier.",
  identifier: "StartEvalCase",
});
const PublicEvalTask = Schema.Struct({
  harness: EvalHarness,
  model: Schema.String.pipe(Schema.minLength(1)),
  provider: PublicEvalProvider,
}).annotations({
  description: "A harness, model, and hosted sandbox combination.",
  identifier: "StartEvalTask",
});
export const PublicStartEvalRequest = Schema.Struct({
  cases: Schema.Array(PublicEvalCase).pipe(Schema.minItems(1)),
  prompt: Schema.String,
  tasks: Schema.Array(PublicEvalTask).pipe(Schema.minItems(1)),
  trials: Schema.Int.pipe(Schema.between(1, 10)),
}).annotations({
  description:
    "Start a grid with at most 100 total case, task, and trial combinations.",
  identifier: "StartEvalRequest",
});
export type PublicStartEvalRequest = typeof PublicStartEvalRequest.Type;

export class PublicEvalsGroup extends HttpApiGroup.make("evals")
  .add(
    HttpApiEndpoint.post("list", "/evals.list")
      .setPayload(ListEvalsRequest)
      .addSuccess(EvalRunPage)
      .annotate(OpenApi.Summary, "List eval runs")
      .annotate(
        OpenApi.Description,
        "Newest first. Pass the `next` cursor from a response to read the page after it; a null `next` means there are no more."
      )
  )
  .add(
    HttpApiEndpoint.post("start", "/evals.start")
      .setPayload(PublicStartEvalRequest)
      .addSuccess(StartedEval)
      .annotate(OpenApi.Summary, "Start an eval run")
      .annotate(
        OpenApi.Description,
        "Starts the grid and returns its id while trials continue in the background."
      )
  )
  .add(
    HttpApiEndpoint.post("get", "/evals.get")
      .setPayload(EvalRunRequest)
      .addSuccess(EvalRun)
      .annotate(OpenApi.Summary, "Get an eval run")
  )
  .add(
    HttpApiEndpoint.post("cellHistory", "/evals.cellHistory")
      .setPayload(EvalCellRequest)
      .addSuccess(Schema.Array(EvalCellHistoryEntry))
      .annotate(OpenApi.Summary, "List a cell's history")
      .annotate(OpenApi.Description, "Returns the 20 most recent results.")
  )
  .add(
    HttpApiEndpoint.post("rerunCell", "/evals.rerunCell")
      .setPayload(
        Schema.extend(
          EvalRunRequest,
          Schema.extend(EvalCellRequest, RerunCellRequest)
        )
      )
      .addSuccess(StartedEval)
      .annotate(OpenApi.Summary, "Rerun one cell")
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
    "Run cases across harness, model, and sandbox combinations and compare the results with their baselines."
  ) {}
