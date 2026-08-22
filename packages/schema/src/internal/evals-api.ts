import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import { Conflict, Forbidden, NotFound } from "../domain/errors";
import {
  CreatePlaygroundRequest,
  EvalCellHistoryEntry,
  EvalRun,
  EvalRunSummary,
  PlaygroundView,
  SavePlaygroundRequest,
  StartEvalRequest,
  StartedEval,
} from "../domain/evals";
import { Authentication } from "./authentication";

const RunPath = Schema.Struct({ id: Schema.String });
const CellPath = Schema.Struct({ cellKey: Schema.String });

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
  /** How this cell has read over time, so a verdict carries when it last
   * moved rather than only which way. Scoped to the caller's organization
   * inside the query: a cell key is a content hash and carries no tenant, so
   * an identical task in another organization would otherwise match. */
  .add(
    HttpApiEndpoint.get("cellHistory", "/evals/cells/:cellKey/history")
      .setPath(CellPath)
      .addSuccess(Schema.Array(EvalCellHistoryEntry))
  )
  /** The workbench: saved between visits, so a person returns to what they
   * were working on rather than rebuilding it. */
  .add(
    HttpApiEndpoint.get("listPlaygrounds", "/playgrounds").addSuccess(
      Schema.Array(PlaygroundView)
    )
  )
  .add(
    HttpApiEndpoint.post("createPlayground", "/playgrounds")
      .setPayload(CreatePlaygroundRequest)
      .addSuccess(PlaygroundView)
  )
  .add(
    HttpApiEndpoint.get("getPlayground", "/playgrounds/:id")
      .setPath(RunPath)
      .addSuccess(PlaygroundView)
  )
  .add(
    HttpApiEndpoint.put("savePlayground", "/playgrounds/:id")
      .setPath(RunPath)
      .setPayload(SavePlaygroundRequest)
      .addSuccess(PlaygroundView)
  )
  /** Starts the saved configuration and returns the run id at once. The work
   * continues behind the response, so closing the tab does not stop it. */
  .add(
    HttpApiEndpoint.post("runPlayground", "/playgrounds/:id/runs")
      .setPath(RunPath)
      .addSuccess(StartedEval)
  )
  .addError(Conflict)
  .addError(Forbidden)
  .addError(NotFound)
  .middleware(Authentication) {}
