import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import { BadRequest, Conflict, Forbidden, NotFound } from "../domain/errors";
import { BatchSubscription } from "../domain/eval-batch-subscription";
import { EvalHome, EvalHomeRange } from "../domain/eval-home";
import { ModelCatalogue } from "../domain/eval-models";
import {
  CaseOrder,
  CaseSort,
  EvalCaseDetail,
  EvalCasePage,
  EvalRunPage,
  EvalSuiteDetail,
  EvalSuitePage,
  EvalTrialAddress,
} from "../domain/eval-read-models";
import { RerunIntent, RerunPlan, RerunRequest } from "../domain/eval-rerun";
import { EvalBatchTail, EvalTailMark } from "../domain/eval-tail";
import {
  EvalArtifact,
  EvalArtifactRequest,
  EvalHarness,
} from "../domain/eval-trial";
import { EvalBatch, EvalRun, StartedBatch } from "../domain/evals";
import { RunCaseRequest } from "../domain/run-case";
import { Authentication } from "./authentication";

const IdPath = Schema.Struct({ id: Schema.String });

export class EvalsGroup extends HttpApiGroup.make("evals")
  .add(
    HttpApiEndpoint.post("artifact", "/evals/artifacts")
      .setPayload(EvalArtifactRequest)
      .addSuccess(EvalArtifact)
  )
  .add(
    HttpApiEndpoint.get("cases", "/evals/cases")
      .setUrlParams(
        Schema.Struct({
          cursorId: Schema.optional(Schema.String),
          cursorStartedAt: Schema.optional(Schema.NumberFromString),
          limit: Schema.optional(Schema.NumberFromString),
          order: Schema.optional(CaseOrder),
          q: Schema.optional(Schema.String),
          sort: Schema.optional(CaseSort),
          suite: Schema.optional(Schema.String),
          tag: Schema.optional(Schema.String),
        })
      )
      .addSuccess(EvalCasePage)
  )
  .add(
    HttpApiEndpoint.get("home", "/evals/home")
      .setUrlParams(Schema.Struct({ range: Schema.optional(EvalHomeRange) }))
      .addSuccess(EvalHome)
  )
  .add(
    HttpApiEndpoint.get("suites", "/evals/suites")
      .setUrlParams(
        Schema.Struct({
          cursorId: Schema.optional(Schema.String),
          cursorStartedAt: Schema.optional(Schema.NumberFromString),
          limit: Schema.optional(Schema.NumberFromString),
        })
      )
      .addSuccess(EvalSuitePage)
  )
  .add(
    HttpApiEndpoint.get("suite", "/evals/suites/:id")
      .setPath(IdPath)
      .addSuccess(EvalSuiteDetail)
  )
  .add(
    HttpApiEndpoint.get("models", "/evals/models")
      .setUrlParams(
        Schema.Struct({
          harness: EvalHarness,
          q: Schema.optional(Schema.String),
        })
      )
      .addSuccess(ModelCatalogue)
  )
  .add(
    HttpApiEndpoint.post("planSuiteRerun", "/evals/suites/:id/runs/plan")
      .setPath(IdPath)
      .setPayload(RerunIntent)
      .addSuccess(RerunPlan)
  )
  .add(
    HttpApiEndpoint.post("rerunSuite", "/evals/suites/:id/runs")
      .setPath(IdPath)
      .setPayload(RerunRequest)
      .addSuccess(StartedBatch)
  )
  .add(
    HttpApiEndpoint.get("case", "/evals/cases/:id")
      .setPath(IdPath)
      .addSuccess(EvalCaseDetail)
  )
  .add(
    HttpApiEndpoint.get("caseRuns", "/evals/cases/:id/runs")
      .setPath(IdPath)
      .setUrlParams(
        Schema.Struct({
          page: Schema.optional(Schema.NumberFromString),
          variant: Schema.optional(Schema.String),
        })
      )
      .addSuccess(EvalRunPage)
  )
  .add(
    HttpApiEndpoint.post("runCase", "/evals/cases/:id/runs")
      .setPath(IdPath)
      .setPayload(RunCaseRequest)
      .addSuccess(StartedBatch)
  )
  .add(
    HttpApiEndpoint.get("run", "/evals/runs/:id")
      .setPath(IdPath)
      .addSuccess(EvalRun)
  )
  .add(
    HttpApiEndpoint.get("trialAddress", "/evals/trials/:id")
      .setPath(IdPath)
      .addSuccess(EvalTrialAddress)
  )
  .add(
    HttpApiEndpoint.get("batch", "/evals/batches/:id")
      .setPath(IdPath)
      .addSuccess(EvalBatch)
  )
  .add(
    HttpApiEndpoint.get("subscription", "/evals/batches/:id/subscription")
      .setPath(IdPath)
      .addSuccess(BatchSubscription)
  )
  .add(
    HttpApiEndpoint.post("tail", "/evals/batches/:id/tail")
      .setPath(IdPath)
      .setPayload(Schema.Struct({ after: Schema.Array(EvalTailMark) }))
      .addSuccess(EvalBatchTail)
  )
  .addError(Conflict)
  .addError(BadRequest)
  .addError(Forbidden)
  .addError(NotFound)
  .middleware(Authentication) {}
