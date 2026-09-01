import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import { BadRequest, Conflict, Forbidden, NotFound } from "../domain/errors";
import {
  CreatePlaygroundRequest,
  EvalCellHistoryEntry,
  EvalHarness,
  EvalRun,
  EvalRunPage,
  ModelCatalogue,
  PlaygroundView,
  RerunCellRequest,
  SavePlaygroundRequest,
  StartEvalRequest,
  StartedEval,
} from "../domain/evals";
import { Authentication } from "./authentication";

const RunPath = Schema.Struct({ id: Schema.String });
const CellPath = Schema.Struct({ cellKey: Schema.String });

export class EvalsGroup extends HttpApiGroup.make("evals")
  .add(
    /* Cursor rather than page number: an offset counts rows the database has
       already discarded, and a run started between two fetches shifts every
       page after it. */
    HttpApiEndpoint.get("list", "/evals")
      .setUrlParams(
        Schema.Struct({
          cursorId: Schema.optional(Schema.String),
          cursorStartedAt: Schema.optional(Schema.NumberFromString),
          limit: Schema.optional(Schema.NumberFromString),
        })
      )
      .addSuccess(EvalRunPage)
  )

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

  .add(
    HttpApiEndpoint.get("cellHistory", "/evals/cells/:cellKey/history")
      .setPath(CellPath)
      .addSuccess(Schema.Array(EvalCellHistoryEntry))
  )

  .add(
    HttpApiEndpoint.post("rerunCell", "/evals/:id/cells/:cellKey/runs")
      .setPath(Schema.Struct({ cellKey: Schema.String, id: Schema.String }))
      .setPayload(RerunCellRequest)
      .addSuccess(StartedEval)
  )

  .add(
    /* The run keeps its own id: a resume continues the cells already recorded
       against it rather than opening a second run beside the first. */
    HttpApiEndpoint.post("resume", "/evals/:id/resume")
      .setPath(RunPath)
      .addSuccess(StartedEval)
  )

  .add(
    HttpApiEndpoint.get("modelCatalogue", "/evals/models")
      /* The harness decides which models exist: Codex takes a bare id and
         OpenCode takes `provider/model`, so a catalogue fetched without one
         offers names the run cannot address. */
      .setUrlParams(
        Schema.Struct({
          harness: EvalHarness,
          /* Filtered on the server because the catalogue is seven thousand
             models: sending them all to be filtered in a browser is the
             1.27 MB the picker used to pay on every open. */
          q: Schema.optional(Schema.String),
        })
      )
      .addSuccess(ModelCatalogue)
  )

  .add(
    HttpApiEndpoint.get("listPlaygrounds", "/evals/playgrounds").addSuccess(
      Schema.Array(PlaygroundView)
    )
  )
  .add(
    HttpApiEndpoint.post("createPlayground", "/evals/playgrounds")
      .setPayload(CreatePlaygroundRequest)
      .addSuccess(PlaygroundView)
  )
  .add(
    HttpApiEndpoint.get("getPlayground", "/evals/playgrounds/:id")
      .setPath(RunPath)
      .addSuccess(PlaygroundView)
  )
  .add(
    HttpApiEndpoint.put("savePlayground", "/evals/playgrounds/:id")
      .setPath(RunPath)
      .setPayload(SavePlaygroundRequest)
      .addSuccess(PlaygroundView)
  )

  .add(
    HttpApiEndpoint.post("runPlayground", "/evals/playgrounds/:id/runs")
      .setPath(RunPath)
      .addSuccess(StartedEval)
  )
  .addError(Conflict)
  .addError(BadRequest)
  .addError(Forbidden)
  .addError(NotFound)
  .middleware(Authentication) {}
