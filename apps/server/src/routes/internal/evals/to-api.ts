import type { HarnessEvent } from "@anpord/eval/domain/harness-event";
import { usageOf } from "@anpord/eval/domain/harness-event";
import {
  commandsIn,
  failedCommandsIn,
  filesIn,
} from "@anpord/eval/domain/journal";
import type { GridCell, GridRunState } from "@anpord/eval/grid/state";
import type { CellHistoryEntry } from "@anpord/eval/repositories/run-query";
import type { CellComparison } from "@anpord/eval/services/baselines";
import type {
  EvalCell,
  EvalCellHistoryEntry,
  EvalComparison,
  EvalJournalEntry,
  EvalRun,
  EvalRunSummary,
  EvalTrial,
} from "@anpord/schema/domain/evals";
import { DateTime, Option } from "effect";

const JOURNAL_OUTPUT_LIMIT = 4000;

const waiting = (
  ordinal: number,
  journal: readonly HarnessEvent[]
): EvalTrial => ({
  commands: commandsIn(journal),
  prepared: null,
  exitCode: -1,
  failedCommands: failedCommandsIn(journal),
  filesChanged: [...filesIn(journal)],
  modelMs: 0,
  ordinal,
  passed: false,
  sandboxId: null,
  sandboxMs: 0,
  status: "running",
  timed: new Set(journal.map((event) => event.at)).size > 1,
  trajectory: asTrajectory(journal),
  usage: null,
  verifySteps: [],
  voidFields: [],
});

const millisOrNull = (at: number | undefined) => at ?? null;

const asTrajectory = (
  events: readonly HarnessEvent[]
): readonly EvalJournalEntry[] =>
  events.flatMap((event): readonly EvalJournalEntry[] => {
    if (event._tag === "Command") {
      return [
        {
          _tag: "command" as const,
          command: event.command,
          exitCode: event.exitCode,
          finishedAtMillis: millisOrNull(event.at),
          output: event.output.slice(0, JOURNAL_OUTPUT_LIMIT),
          startedAtMillis: millisOrNull(event.startedAt),
        },
      ];
    }

    if (event._tag === "Message") {
      return [
        {
          _tag: "message" as const,
          finishedAtMillis: millisOrNull(event.at),
          text: event.text,
          usage: event.usage ?? null,
        },
      ];
    }

    if (event._tag === "ToolCall") {
      return [
        {
          _tag: "toolCall" as const,
          finishedAtMillis: millisOrNull(event.at),
          name: event.name,
          startedAtMillis: millisOrNull(event.startedAt),
          status: event.status,
        },
      ];
    }

    if (event._tag === "FileChange") {
      return [
        {
          _tag: "fileChange" as const,
          finishedAtMillis: millisOrNull(event.at),
          paths: [...event.paths],
        },
      ];
    }

    return [];
  });

const asTrials = (cell: GridCell): readonly EvalTrial[] =>
  cell.trials.map((trial, index) =>
    Option.match(trial, {
      onNone: () => waiting(index + 1, cell.live.get(index + 1) ?? []),
      onSome: (result) => ({
        commands: result.commands,
        prepared: null,
        exitCode: result.outcome.exitCode,
        failedCommands: result.failedCommands,
        filesChanged: [...result.filesChanged],
        modelMs: result.outcome.modelMs,
        ordinal: index + 1,
        passed: result.outcome.passed,
        sandboxId: result.sandboxId,
        sandboxMs: result.outcome.sandboxMs,
        status: result.outcome.status,

        timed: new Set(result.events.map((event) => event.at)).size > 1,
        trajectory: asTrajectory(result.events),
        usage: Option.getOrNull(result.usage),
        verifySteps: [...result.outcome.verifySteps],
        voidFields: [...result.outcome.voidFields],
      }),
    })
  );

/**
 * A stored trial row as the wire sees it.
 *
 * No trajectory: the journal is fetched per trial, and a history of twenty
 * readings would pull twenty journals to draw a table that shows none of them.
 * The trial's own page is where a trajectory is read.
 */
const asStoredTrial = (trial: {
  readonly commandCount: number | null;
  readonly exitCode: number | null;
  readonly modelMs: number | null;
  readonly ordinal: number;
  readonly passed: boolean | null;
  readonly sandboxId: string | null;
  readonly sandboxMs: number | null;
  readonly status: string;
  readonly usage: Record<string, number> | null;
  readonly verifySteps: { command: string; exitCode: number }[] | null;
  readonly voidFields: string[] | null;
}): EvalTrial => ({
  commands: trial.commandCount ?? 0,
  prepared: null,
  exitCode: trial.exitCode ?? -1,
  failedCommands: 0,
  filesChanged: [],
  modelMs: trial.modelMs ?? 0,
  ordinal: trial.ordinal,
  passed: trial.passed ?? false,
  sandboxId: trial.sandboxId,
  sandboxMs: trial.sandboxMs ?? 0,
  status: trial.status as EvalTrial["status"],
  timed: false,
  trajectory: [],
  usage: usageOf(trial.usage),
  verifySteps: trial.verifySteps ?? [],
  voidFields: trial.voidFields ?? [],
});

/**
 * One past reading of a cell, with the trials it was computed from.
 *
 * Every reading holds the same case, setup and variant, because the cell key
 * hashes all three. Only the trials differ, which is why they travel together
 * rather than a page apart.
 */
export const asReading = (entry: CellHistoryEntry): EvalCellHistoryEntry => ({
  distribution: entry.distribution,
  finishedAt:
    entry.finishedAt === null
      ? null
      : DateTime.unsafeMake(entry.finishedAt.getTime()),
  internalId: entry.internalId,
  runId: entry.runId,
  trials: entry.trials.map(asStoredTrial),
});

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
  setup: Option.getOrNull(cell.setup),
  status: cell.status,
  taskIndex: cell.taskIndex,
  trials: asTrials(cell),
});

const outcomeOf = (state: GridRunState) => {
  const distributions = state.cells.flatMap((cell) =>
    Option.match(cell.distribution, {
      onNone: () => [],
      onSome: (distribution) => [distribution],
    })
  );

  const total = (pick: (of: (typeof distributions)[number]) => number) =>
    distributions.reduce((sum, distribution) => sum + pick(distribution), 0);

  const spread = (pick: (of: (typeof distributions)[number]) => number) =>
    distributions.length === 0 ? null : distributions.map(pick);

  const mins = spread((distribution) => distribution.commandMin);
  const maxes = spread((distribution) => distribution.commandMax);

  return {
    commandMax: maxes === null ? null : Math.max(...maxes),
    commandMin: mins === null ? null : Math.min(...mins),
    passed: total((distribution) => distribution.passed),
    scored: total((distribution) => distribution.scored),
    voided: total((distribution) => distribution.voided),
  };
};

export const summarise = (state: GridRunState): EvalRunSummary => ({
  caseCount: state.cases.length,
  columns: [...state.tasks],
  ...outcomeOf(state),
  failure: Option.getOrNull(state.failure),
  finishedAt: Option.map(state.finishedAt, DateTime.unsafeMake).pipe(
    Option.getOrNull
  ),
  id: state.id,

  name: state.cases[0] ?? null,
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

  tasks: state.tasks.map((task) => ({
    harness: task.harness,
    harnessVersion: task.harnessVersion,
    model: task.model,
    provider: task.provider,
  })),
});
