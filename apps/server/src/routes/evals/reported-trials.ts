import { GridRun } from "@anpord/eval/grid/run";
import { cellKeyOfPosition } from "@anpord/eval/grid/state";
import { NotFound } from "@anpord/schema/domain/errors";
import { CurrentActor } from "@anpord/schema/internal/authentication";
import type { ReportTrialRequest } from "@anpord/schema/public/evals-api";
import { Effect, Option } from "effect";
import { getEvalRun } from "./operations";

export const reportedRun = (id: string) =>
  Effect.gen(function* () {
    const actor = yield* CurrentActor;
    const grid = yield* GridRun;
    const run = yield* grid.get(actor.organizationId, id);

    if (Option.isNone(run)) {
      return yield* new NotFound({ message: `No eval run ${id}` });
    }

    if (run.value.executedBy !== "client") {
      return yield* new NotFound({
        message: `Eval run ${id} runs on the platform, so its trials are not reported`,
      });
    }

    return run.value;
  });

export const reportTrial = ({ id, trial }: ReportTrialRequest) =>
  Effect.gen(function* () {
    const run = yield* reportedRun(id);
    const position = cellKeyOfPosition(trial.taskIndex, trial.caseName);

    const cell = run.cells.find(
      (one) => cellKeyOfPosition(one.taskIndex, one.caseName) === position
    );

    if (cell?.internalId == null) {
      return yield* new NotFound({
        message: `Eval run ${id} has no cell ${position}`,
      });
    }

    yield* (yield* GridRun).report({
      cellInternalId: cell.internalId,
      trial,
    });
  }).pipe(
    Effect.catchTag("EvalStoreError", Effect.die),
    Effect.withSpan("Evals.reportTrial", { attributes: { runId: id } })
  );

export const finishReportedRun = (id: string) =>
  Effect.gen(function* () {
    const run = yield* reportedRun(id);

    yield* (yield* GridRun).finishReported({
      failed: run.cells.some((cell) => cell.status === "failed"),
      organizationId: run.organizationId,
      runId: id,
    });

    return yield* getEvalRun(id);
  }).pipe(
    Effect.catchTag("EvalStoreError", Effect.die),
    Effect.withSpan("Evals.finishRun", { attributes: { runId: id } })
  );
