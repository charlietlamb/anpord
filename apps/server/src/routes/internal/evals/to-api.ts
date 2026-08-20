import type { CellComparison } from "@anpord/eval/services/baselines";
import type { GridCell, GridRunState } from "@anpord/eval/services/grid-state";
import type {
  EvalCell,
  EvalComparison,
  EvalRun,
  EvalRunSummary,
  EvalTrial,
} from "@anpord/schema/domain/evals";
import { DateTime, Option } from "effect";

const JOURNAL_OUTPUT_LIMIT = 4000;

const waiting = (ordinal: number): EvalTrial => ({
  commands: 0,
  failedCommands: 0,
  filesChanged: [],
  journal: [],
  modelMs: 0,
  ordinal,
  passed: false,
  sandboxId: null,
  sandboxMs: 0,
  status: "running",
  voidFields: [],
});

/** The journal travels with the trial rather than behind another request. An
 * exit code the caller cannot see is the thing this system exists to stop
 * being invisible. */
const asTrials = (cell: GridCell): readonly EvalTrial[] =>
  cell.trials.map((trial, index) =>
    Option.match(trial, {
      onNone: () => waiting(index + 1),
      onSome: (result) => ({
        commands: result.commands,
        failedCommands: result.failedCommands,
        filesChanged: [...result.filesChanged],
        journal: result.events
          .filter((event) => event._tag === "Command")
          .map((event) => ({
            command: event.command,
            exitCode: event.exitCode,
            output: event.output.slice(0, JOURNAL_OUTPUT_LIMIT),
          })),
        modelMs: result.outcome.modelMs,
        ordinal: index + 1,
        passed: result.outcome.passed,
        sandboxId: result.sandboxId,
        sandboxMs: result.outcome.sandboxMs,
        status: result.outcome.status,
        voidFields: [...result.outcome.voidFields],
      }),
    })
  );

const asComparison = (
  comparisons: readonly CellComparison[],
  cellKey: string | null
): EvalComparison | null => {
  if (cellKey === null) {
    return null;
  }

  const found = comparisons.find((entry) => entry.cellKey === cellKey);

  if (found === undefined || Option.isNone(found.comparison)) {
    return null;
  }

  return found.comparison.value;
};

const asCell = (
  cell: GridCell,
  comparisons: readonly CellComparison[]
): EvalCell => ({
  caseName: cell.caseName,
  cellKey: cell.cellKey,
  comparison: asComparison(comparisons, cell.cellKey),
  distribution: Option.getOrNull(cell.distribution),
  internalId: cell.internalId,
  status: cell.status,
  taskIndex: cell.taskIndex,
  trials: asTrials(cell),
});

export const summarise = (state: GridRunState): EvalRunSummary => ({
  caseCount: state.cases.length,
  id: state.id,
  startedAt: DateTime.unsafeMake(state.startedAt),
  status: state.status,
  taskCount: state.tasks.length,
});

export const detail = (
  state: GridRunState,
  comparisons: readonly CellComparison[]
): EvalRun => ({
  cases: [...state.cases],
  cells: state.cells.map((cell) => asCell(cell, comparisons)),
  failure: Option.getOrNull(state.failure),
  finishedAt: Option.map(state.finishedAt, DateTime.unsafeMake).pipe(
    Option.getOrNull
  ),
  id: state.id,
  startedAt: DateTime.unsafeMake(state.startedAt),
  status: state.status,
  /* The domain knows three harnesses and the API exposes the one that works,
     so the boundary narrows rather than leaking a name a client cannot act
     on. Adding Claude Code widens both, in that order. */
  tasks: state.tasks.map((task) => ({
    harness: "codex" as const,
    model: task.model,
    provider: task.provider,
  })),
});
