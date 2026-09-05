import type { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { Context, Effect, Layer, type Option } from "effect";
import type { EvalStoreError } from "../domain/errors";
import {
  type CellHistoryEntry,
  type CellHistoryInput,
  cellHistoryQuery,
} from "./cell-history-query";
import type { RunDetail } from "./run-detail";
import { runDetailQuery } from "./run-detail-query";
import { type ListRunsInput, runListQuery } from "./run-list-query";
import {
  type CellTask,
  type CellTaskInput,
  type RunTasksInput,
  runTasksQuery,
} from "./run-tasks-query";

type RunRow = typeof evalRun.$inferSelect;

export interface RunQueryShape {
  /** How many runs the organization has, for a reader who wants to know how
   * far the listing goes. Separate from the page itself because a page is
   * read on every step and this only when the count is shown. */
  /** How many of the organization's runs are still running, which is what
   * bounds how many sandboxes it can have open at once. */
  readonly countRunning: (
    organizationId: string
  ) => Effect.Effect<number, EvalStoreError>;
  readonly countRuns: (
    organizationId: string
  ) => Effect.Effect<number, EvalStoreError>;
  readonly findCellHistory: (
    input: CellHistoryInput
  ) => Effect.Effect<readonly CellHistoryEntry[], EvalStoreError>;
  readonly findCellTask: (
    input: CellTaskInput
  ) => Effect.Effect<Option.Option<CellTask>, EvalStoreError>;
  readonly findRun: (
    organizationId: string,
    runId: string
  ) => Effect.Effect<Option.Option<RunDetail>, EvalStoreError>;

  readonly findRunTasks: (
    input: RunTasksInput
  ) => Effect.Effect<readonly CellTask[], EvalStoreError>;
  readonly hydrateRuns: (
    runs: readonly RunRow[]
  ) => Effect.Effect<readonly RunDetail[], EvalStoreError>;
  readonly listRuns: (
    input: ListRunsInput
  ) => Effect.Effect<readonly RunRow[], EvalStoreError>;
}

export class RunQuery extends Context.Tag("@anpord/eval/RunQuery")<
  RunQuery,
  RunQueryShape
>() {}

export const RunQueryLive = Layer.effect(
  RunQuery,
  Effect.gen(function* () {
    const list = yield* runListQuery;
    const detail = yield* runDetailQuery;
    const history = yield* cellHistoryQuery;
    const tasks = yield* runTasksQuery;

    return RunQuery.of({
      countRunning: list.countRunning,
      countRuns: list.countRuns,
      findCellHistory: history.findCellHistory,
      findCellTask: tasks.findCellTask,
      findRunTasks: tasks.findRunTasks,
      findRun: detail.findRun,
      hydrateRuns: detail.hydrateRuns,
      listRuns: list.listRuns,
    });
  })
);
