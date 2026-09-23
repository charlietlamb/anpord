import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform";
import { Schema } from "effect";
import { BadRequest, Conflict, Forbidden, NotFound } from "../domain/errors";
import {
  EvalCaseId,
  EvalCaseName,
  EvalPrompt,
  EvalVerify,
} from "../domain/eval-limits";
import {
  ModelCatalogue,
  RerunCellRequest,
  StartedEval,
} from "../domain/eval-playground";
import {
  MAX_RUN_TRIALS,
  MAX_START_CASES,
  MAX_START_TASKS,
  MAX_START_TRIALS,
} from "../domain/eval-quota";
import { EvalRunTail, EvalRunTailRequest } from "../domain/eval-tail";
import { EvalTrigger } from "../domain/eval-trigger";
import { EvalUser } from "../domain/eval-turns";
import {
  CaseCache,
  EvalArtifact,
  EvalArtifactRequest,
  EvalCasePage,
  EvalCellHistoryEntry,
  EvalHarness,
  EvalName,
  EvalPageCursor,
  EvalPrepare,
  EvalRun,
  EvalRunPage,
  EvalSource,
  EvalValidator,
  EvalVariables,
  HOSTED_SANDBOXES,
  RunSubscription,
} from "../domain/evals";
import { HarnessEvent, HarnessUsage } from "../domain/harness-event";
import {
  HarnessProfile,
  PROFILE_HARNESS_RULE,
  profileFitsHarness,
} from "../domain/harness-profile";
import { TrialOutcome } from "../domain/trial";
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
  q: Schema.optional(Schema.String),
}).annotations({
  description: "Select a harness whose available models should be listed.",
  identifier: "EvalModelsRequest",
});
/* `local` runs on whatever machine serves the request, so the hosted API
   never offers it: a caller must not be able to ask someone else's server
   for a shell. A developer names it from their own CLI instead. */
const PublicEvalSandbox = Schema.Literal(...HOSTED_SANDBOXES).annotations({
  description: "The hosted sandbox a task runs in.",
  identifier: "PublicEvalSandbox",
});
export const ListCasesRequest = Schema.Struct({
  cursor: Schema.optional(Schema.NullOr(EvalPageCursor)),
  limit: Schema.optional(Schema.Int),
  tag: Schema.optional(Schema.NullOr(Schema.String)),
}).annotations({
  description: "Which cases to read, where to read from, and how much.",
  identifier: "ListCasesRequest",
});

export const ListEvalsRequest = Schema.Struct({
  cursor: Schema.optional(Schema.NullOr(EvalPageCursor)),
  limit: Schema.optional(Schema.Int),
}).annotations({
  description: "Where to read from, and how much.",
  identifier: "ListEvalsRequest",
});

const PublicEvalCase = Schema.Struct({
  cache: Schema.optional(CaseCache),
  id: EvalCaseId,
  name: EvalCaseName,
  prepare: Schema.optional(Schema.NullOr(EvalPrepare)),
  source: Schema.optional(EvalSource),
  user: Schema.optional(Schema.NullOr(EvalUser)),
  validator: Schema.optional(Schema.NullOr(EvalValidator)),
  variables: Schema.optional(EvalVariables),
  verify: Schema.NullOr(EvalVerify),
})
  .pipe(
    Schema.filter(
      ({ validator, verify }) =>
        !(validator !== undefined && validator !== null && verify !== null),
      { message: () => "Use either validator or verify, not both." }
    )
  )
  .annotations({
    description: "A task, workspace source, setup command, and verifier.",
    identifier: "StartEvalCase",
  });
/* The generated JSON Schema drops the struct filter, so tool and endpoint descriptions repeat the harness rule. */
const PublicEvalTask = Schema.Struct({
  harness: EvalHarness,
  model: Schema.String.pipe(Schema.minLength(1)),
  profile: Schema.optional(HarnessProfile),
  sandbox: Schema.optional(PublicEvalSandbox),
})
  .pipe(
    Schema.filter(profileFitsHarness, { message: () => PROFILE_HARNESS_RULE })
  )
  .annotations({
    description: `A harness and model, with an optional sandbox and an optional profile layered on the harness. Omit the sandbox to use the default. ${PROFILE_HARNESS_RULE}`,
    identifier: "StartEvalTask",
  });
export const PublicStartEvalRequest = Schema.Struct({
  trigger: Schema.optional(EvalTrigger),
  cases: Schema.Array(PublicEvalCase).pipe(
    Schema.minItems(1),
    Schema.maxItems(MAX_START_CASES)
  ),
  executeLocally: Schema.optional(Schema.Boolean),
  name: Schema.optional(EvalName),
  prompt: EvalPrompt,
  tasks: Schema.Array(PublicEvalTask).pipe(
    Schema.minItems(1),
    Schema.maxItems(MAX_START_TASKS)
  ),
  trials: Schema.Int.pipe(Schema.between(1, MAX_START_TRIALS)),
}).annotations({
  description: `Start a grid with at most ${MAX_RUN_TRIALS} total case, task, and trial combinations.`,
  identifier: "StartEvalRequest",
});
export type PublicStartEvalRequest = typeof PublicStartEvalRequest.Type;

export const CredentialLeaseRequest = Schema.Struct({
  harness: EvalHarness,
  id: Schema.String,
}).annotations({
  description:
    "Ask for the credentials a run the caller is executing needs, for the harness it names.",
  identifier: "CredentialLeaseRequest",
});
export type CredentialLeaseRequest = typeof CredentialLeaseRequest.Type;

export const CredentialLease = Schema.Struct({
  expiresAt: Schema.DateTimeUtc,
  values: Schema.Record({ key: Schema.String, value: Schema.String }),
}).annotations({
  description:
    "Credentials for one run, held in memory and never written down. Short-lived: start another run rather than keeping these.",
  identifier: "CredentialLease",
});
export type CredentialLease = typeof CredentialLease.Type;

export const ReportedTrial = Schema.Struct({
  caseName: EvalCaseName,
  events: Schema.Array(HarnessEvent),
  ordinal: Schema.Int.pipe(Schema.nonNegative()),
  outcome: TrialOutcome,
  sandboxId: Schema.optional(Schema.NullOr(Schema.String)),
  taskIndex: Schema.Int.pipe(Schema.nonNegative()),
  usage: Schema.optional(Schema.NullOr(HarnessUsage)),
}).annotations({
  description: "One trial a client ran and is reporting the result of.",
  identifier: "ReportedTrial",
});
export type ReportedTrial = typeof ReportedTrial.Type;

export const ReportTrialRequest = Schema.Struct({
  id: Schema.String,
  trial: ReportedTrial,
}).annotations({
  description: "A trial the caller ran, named by the run it belongs to.",
  identifier: "ReportTrialRequest",
});
export type ReportTrialRequest = typeof ReportTrialRequest.Type;

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
    HttpApiEndpoint.post("cases", "/evals.cases")
      .setPayload(ListCasesRequest)
      .addSuccess(EvalCasePage)
      .annotate(OpenApi.Summary, "List cases")
      .annotate(
        OpenApi.Description,
        "One row per case, newest run first, carrying its newest run. Pass `tag` to read only the cases carrying it, and the `next` cursor from a response to read the page after it; a null `next` means there are no more."
      )
  )
  .add(
    HttpApiEndpoint.post("start", "/evals.start")
      .setPayload(PublicStartEvalRequest)
      .addSuccess(StartedEval)
      .annotate(OpenApi.Summary, "Start an eval run")
      .annotate(
        OpenApi.Description,
        `Starts the grid and returns its id while trials continue in the background. ${PROFILE_HARNESS_RULE}`
      )
  )
  .add(
    HttpApiEndpoint.post("credentials", "/evals.credentials")
      .setPayload(CredentialLeaseRequest)
      .addSuccess(CredentialLease)
      .annotate(OpenApi.Summary, "Lease the credentials a local run needs")
      .annotate(
        OpenApi.Description,
        "For a run started with executeLocally, so the machine running it holds no credentials of its own. Returns the organization credential for one harness, expiring in minutes. Sandbox credentials are never leased: a local run opens no cloud sandbox."
      )
  )
  .add(
    HttpApiEndpoint.post("reportTrial", "/evals.reportTrial")
      .setPayload(ReportTrialRequest)
      .addSuccess(Schema.Void)
      .annotate(OpenApi.Summary, "Report a trial run outside the platform")
      .annotate(
        OpenApi.Description,
        "For a run started with executeLocally. The result is recorded as reported: it was produced somewhere the platform cannot inspect, so it is marked and kept out of baselines."
      )
  )
  .add(
    HttpApiEndpoint.post("finishRun", "/evals.finishRun")
      .setPayload(EvalRunRequest)
      .addSuccess(EvalRun)
      .annotate(OpenApi.Summary, "Settle a run whose trials the caller ran")
      .annotate(
        OpenApi.Description,
        "Settles the run from the trials reported so far. A run left unsettled is swept like any other abandoned work."
      )
  )
  .add(
    HttpApiEndpoint.post("artifact", "/evals.artifact")
      .setPayload(EvalArtifactRequest)
      .addSuccess(EvalArtifact)
  )
  .add(
    HttpApiEndpoint.post("get", "/evals.get")
      .setPayload(EvalRunRequest)
      .addSuccess(EvalRun)
      .annotate(OpenApi.Summary, "Get an eval run")
  )
  .add(
    HttpApiEndpoint.post("subscription", "/evals.subscription")
      .setPayload(EvalRunRequest)
      .addSuccess(RunSubscription)
      .annotate(OpenApi.Summary, "Watch an eval run as it moves")
      .annotate(
        OpenApi.Description,
        "Returns a read-only token scoped to this run, for following it in real time. Short-lived: request another when it expires."
      )
  )
  .add(
    HttpApiEndpoint.post("tail", "/evals.tail")
      .setPayload(EvalRunTailRequest)
      .addSuccess(EvalRunTail)
      .annotate(OpenApi.Exclude, true)
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
      .annotate(
        OpenApi.Description,
        "The command harness has no catalogue of its own, so its list is empty: the model is whatever the profile's run command reads from ANPORD_MODEL."
      )
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
