import type { EvalTrigger } from "@anpord/schema/domain/eval-trigger";
import type { EvalCasePage, EvalExecutor } from "@anpord/schema/domain/evals";
import { Context, Effect, Layer, type Option, type Stream } from "effect";
import type { EvalStoreError } from "../domain/errors";
import type { PageCursor } from "../domain/page";
import type { GridCase } from "./cell";
import { makeExecuteRun } from "./execute-run";
import { makeLiveRuns } from "./live-runs";
import { makeReadRuns } from "./read-runs";
import type { FinishReported, ReportTrial } from "./report-run";
import { makeReportRun } from "./report-run";
import { makeStartRun } from "./start-run";
import type { GridExecutionTask, GridRunState } from "./state";

export interface ResumeGrid {
  readonly created: { readonly id: string; readonly internalId: string };
  readonly input: StartGrid;
  readonly registered: readonly {
    readonly caseInternalId: string;
    readonly definitionHash: string;
    readonly internalId: string;
  }[];
}

export interface StartGrid {
  readonly cases: readonly GridCase[];
  readonly executedBy?: EvalExecutor | null;
  readonly name: string | null;
  readonly organizationId: string;
  readonly prompt: string;
  readonly startedBy: string | null;
  readonly tasks: readonly GridExecutionTask[];
  readonly trials: number;
  readonly trigger?: EvalTrigger | null;
}

export interface GridRunPage {
  readonly next: PageCursor | null;
  readonly runs: readonly GridRunState[];
  readonly total: number;
}

export interface GridRunShape {
  readonly cases: (input: {
    readonly cursor: PageCursor | null;
    readonly limit: number | undefined;
    readonly organizationId: string;
    readonly tag: string | null;
  }) => Effect.Effect<EvalCasePage>;
  readonly changes: Stream.Stream<GridRunState>;

  /* What a runner is handed, not what asks for one: a worker calling resume
     would dispatch the run to itself forever. */
  readonly execute: (grid: ResumeGrid) => Effect.Effect<void>;
  readonly finishReported: (
    input: FinishReported
  ) => Effect.Effect<boolean, EvalStoreError>;
  readonly get: (
    organizationId: string,
    id: string
  ) => Effect.Effect<Option.Option<GridRunState>>;
  readonly list: (input: {
    readonly cursor: PageCursor | null;
    readonly limit: number | undefined;
    readonly organizationId: string;
  }) => Effect.Effect<GridRunPage>;
  readonly report: (input: ReportTrial) => Effect.Effect<void, EvalStoreError>;
  readonly resume: (grid: ResumeGrid) => Effect.Effect<void>;
  readonly start: (input: StartGrid) => Effect.Effect<string>;
}

export class GridRun extends Context.Tag("@anpord/eval/GridRun")<
  GridRun,
  GridRunShape
>() {}

export const GridRunLive = Layer.scoped(
  GridRun,
  Effect.gen(function* () {
    const live = yield* makeLiveRuns;
    const { execute, resume } = yield* makeExecuteRun(live);
    const start = yield* makeStartRun(execute, live);
    const reporting = yield* makeReportRun;
    const { cases, get, list } = yield* makeReadRuns(live);

    return GridRun.of({
      changes: live.changes,
      execute,
      finishReported: reporting.finishReported,
      cases,
      get,
      list,
      report: reporting.report,
      resume,
      start,
    });
  })
);
