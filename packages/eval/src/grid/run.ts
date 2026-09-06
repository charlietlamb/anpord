import { Context, Effect, Layer, type Option, type Stream } from "effect";
import type { PageCursor } from "../domain/page";
import type { GridCase } from "./cell";
import { makeExecuteRun } from "./execute-run";
import { makeLiveRuns } from "./live-runs";
import { makeReadRuns } from "./read-runs";
import { makeStartRun } from "./start-run";
import type { GridExecutionTask, GridRunState } from "./state";

export interface ResumeGrid {
  readonly created: { readonly id: string; readonly internalId: string };
  readonly input: StartGrid;
  readonly registered: readonly {
    readonly id: string;
    readonly internalId: string;
  }[];
}

export interface StartGrid {
  readonly cases: readonly GridCase[];
  readonly name: string | null;
  readonly organizationId: string;
  readonly prompt: string;
  readonly startedBy: string | null;
  readonly tasks: readonly GridExecutionTask[];
  readonly trials: number;
}

export interface GridRunPage {
  readonly next: PageCursor | null;
  readonly runs: readonly GridRunState[];
  readonly total: number;
}

export interface GridRunShape {
  readonly changes: Stream.Stream<GridRunState>;

  /* What a runner is handed, not what asks for one: a worker calling resume
     would dispatch the run to itself forever. */
  readonly execute: (grid: ResumeGrid) => Effect.Effect<void>;

  readonly get: (
    organizationId: string,
    id: string
  ) => Effect.Effect<Option.Option<GridRunState>>;
  readonly list: (input: {
    readonly cursor: PageCursor | null;
    readonly limit: number | undefined;
    readonly organizationId: string;
  }) => Effect.Effect<GridRunPage>;
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
    const start = yield* makeStartRun(execute);
    const { get, list } = yield* makeReadRuns(live);

    return GridRun.of({
      changes: live.changes,
      execute,
      get,
      list,
      resume,
      start,
    });
  })
);
