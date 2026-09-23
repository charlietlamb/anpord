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
  type CasePageResult,
  caseListQuery,
  type ListCasesInput,
} from "./case-list-query";
import type { CaseScope } from "./case-variants";
import {
  type CaseHistoryInput,
  type CaseHistoryPage,
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
import {
  type RunAddressInput,
  type TrialAddress,
  trialAddressQuery,
} from "./trial-address-query";

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
  readonly findCaseHistory: (
    input: CaseHistoryInput
  ) => Effect.Effect<CaseHistoryPage, EvalStoreError>;
  readonly findCaseTasks: (
    scope: CaseScope
  ) => Effect.Effect<readonly CellTask[], EvalStoreError>;
  readonly findCaseVariants: (
    scope: CaseScope
  ) => Effect.Effect<readonly CellHistoryEntry[], EvalStoreError>;
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
  readonly findRunAddresses: (
    input: RunAddressInput
  ) => Effect.Effect<readonly TrialAddress[], EvalStoreError>;

  readonly findRunTasks: (
    input: RunTasksInput
  ) => Effect.Effect<readonly CellTask[], EvalStoreError>;
  readonly findTrial: (input: {
    readonly organizationId: string;
    readonly trialId: string;
  }) => Effect.Effect<Option.Option<TrialAddress>, EvalStoreError>;
  readonly hydrateRuns: (
    runs: readonly RunRow[]
  ) => Effect.Effect<readonly RunDetail[], EvalStoreError>;
  readonly listCases: (
    input: ListCasesInput
  ) => Effect.Effect<CasePageResult, EvalStoreError>;
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
    const variants = yield* runTasksQuery;
    const cases = yield* caseListQuery;
    const subject = yield* caseDetailQuery;
    const tail = yield* runTailQuery;
    const addresses = yield* trialAddressQuery;

    return RunQuery.of({
      countRunning: list.countRunning,
      countRuns: list.countRuns,
      findCase: subject.findCase,
      findCaseHistory: history.findCaseHistory,
      findCaseTasks: variants.findCaseTasks,
      findCaseVariants: history.findCaseVariants,
      findCellHistory: history.findCellHistory,
      findCellTask: variants.findCellTask,
      findRunTasks: variants.findRunTasks,
      listCases: cases.listCases,
      listTags: cases.listTags,
      findRun: detail.findRun,
      findRunAddresses: addresses.findRunAddresses,
      findTrial: addresses.findTrial,
      hydrateRuns: detail.hydrateRuns,
      listRuns: list.listRuns,
      readTail: tail.readTail,
    });
  })
);
