import type { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { Context, Effect, Layer, type Option } from "effect";
import type { EvalStoreError } from "../domain/errors";
import type { RunTail } from "../domain/tail";
import {
  type CaseDetail,
  type CaseDetailInput,
  caseDetailQuery,
} from "./case-detail-query";
import {
  type CaseSummary,
  caseListQuery,
  type ListCasesInput,
} from "./case-list-query";
import {
  type CellHistoryEntry,
  type CellHistoryInput,
  cellHistoryQuery,
} from "./cell-history-query";
import type { RunDetail } from "./run-detail";
import { runDetailQuery } from "./run-detail-query";
import { type ListRunsInput, runListQuery } from "./run-list-query";
import { type RunTailInput, runTailQuery } from "./run-tail-query";
import {
  type CellTask,
  type CellTaskInput,
  type RunTasksInput,
  runTasksQuery,
} from "./run-tasks-query";

type RunRow = typeof evalRun.$inferSelect;

export interface RunQueryShape {
  /* Separate from the page itself: a page is read on every step, this only when
     the count is shown. */
  /* Bounds how many sandboxes an organization can have open at once. */
  readonly countRunning: (
    organizationId: string
  ) => Effect.Effect<number, EvalStoreError>;
  readonly countRuns: (
    organizationId: string
  ) => Effect.Effect<number, EvalStoreError>;
  readonly findCase: (
    input: CaseDetailInput
  ) => Effect.Effect<Option.Option<CaseDetail>, EvalStoreError>;
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
  readonly listCases: (
    input: ListCasesInput
  ) => Effect.Effect<readonly CaseSummary[], EvalStoreError>;
  readonly listRuns: (
    input: ListRunsInput
  ) => Effect.Effect<readonly RunRow[], EvalStoreError>;
  readonly listTags: (
    organizationId: string
  ) => Effect.Effect<readonly string[], EvalStoreError>;
  readonly readTail: (
    input: RunTailInput
  ) => Effect.Effect<Option.Option<RunTail>, EvalStoreError>;
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
    const cases = yield* caseListQuery;
    const subject = yield* caseDetailQuery;
    const tail = yield* runTailQuery;

    return RunQuery.of({
      countRunning: list.countRunning,
      countRuns: list.countRuns,
      findCase: subject.findCase,
      findCellHistory: history.findCellHistory,
      findCellTask: tasks.findCellTask,
      findRunTasks: tasks.findRunTasks,
      listCases: cases.listCases,
      listTags: cases.listTags,
      findRun: detail.findRun,
      hydrateRuns: detail.hydrateRuns,
      listRuns: list.listRuns,
      readTail: tail.readTail,
    });
  })
);
