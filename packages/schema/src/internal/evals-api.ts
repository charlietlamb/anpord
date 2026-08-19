import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import { Forbidden, NotFound } from "../domain/errors";
import {
  EvalRun,
  EvalRunSummary,
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
  .addError(Forbidden)
  .addError(NotFound)
  .middleware(Authentication) {}
