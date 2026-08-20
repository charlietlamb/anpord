import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import { Conflict, Forbidden, NotFound } from "../domain/errors";
import {
  EvalRun,
  EvalRunSummary,
  PromoteBaselineRequest,
  PromotedBaseline,
  StartEvalRequest,
  StartedEval,
} from "../domain/evals";
import { Authentication } from "./authentication";

const RunPath = Schema.Struct({ id: Schema.String });

export class EvalsGroup extends HttpApiGroup.make("evals")
  .add(
    HttpApiEndpoint.get("list", "/evals").addSuccess(
      Schema.Array(EvalRunSummary)
    )
  )
  /** Returns as soon as the run is recorded rather than when it finishes. A
   * trial takes tens of seconds and spends real money, so a request that held
   * open for it would die on any proxy long before the answer arrived. */
  .add(
    HttpApiEndpoint.post("start", "/evals")
      .setPayload(StartEvalRequest)
      .addSuccess(StartedEval)
  )
  .add(
    HttpApiEndpoint.get("get", "/evals/:id")
      .setPath(RunPath)
      .addSuccess(EvalRun)
  )
  /** Accepting a reading as the reference to measure later runs against.
   * Explicit rather than inferred from the most recent run: if the latest
   * reading silently became the reference, a bad day would be adopted as the
   * new normal and the drift would be absorbed one run at a time. */
  .add(
    HttpApiEndpoint.post("promote", "/evals/baselines")
      .setPayload(PromoteBaselineRequest)
      .addSuccess(PromotedBaseline)
  )
  .addError(Conflict)
  .addError(Forbidden)
  .addError(NotFound)
  .middleware(Authentication) {}
