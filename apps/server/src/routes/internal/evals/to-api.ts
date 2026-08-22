import type { HarnessEvent } from "@anpord/eval/domain/harness-event";
import type { GridCell, GridRunState } from "@anpord/eval/grid/state";
import type { CellComparison } from "@anpord/eval/services/baselines";
import type {
  EvalCell,
  EvalComparison,
  EvalJournalEntry,
  EvalRun,
  EvalRunSummary,
  EvalTrial,
} from "@anpord/schema/domain/evals";
import { DateTime, Option } from "effect";

const JOURNAL_OUTPUT_LIMIT = 4000;

const waiting = (ordinal: number): EvalTrial => ({
  commands: 0,
  exitCode: -1,
  failedCommands: 0,
  filesChanged: [],
  modelMs: 0,
  ordinal,
  passed: false,
  sandboxId: null,
  sandboxMs: 0,
  status: "running",
  timed: false,
  trajectory: [],
  usage: null,
  voidFields: [],
});

const millisOrNull = (at: number | undefined) => at ?? null;

/* Every kind of event kept, in order: a trace of commands alone is a trace
   with the context removed. */
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
        },
      ];
    }

    if (event._tag === "ToolCall") {
      return [
        {
          _tag: "toolCall" as const,
          finishedAtMillis: millisOrNull(event.at),
          name: event.name,
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

    /* Started and Finished bracket the run rather than describing work, and a
       waterfall takes its extent from the trial's own times. */
    return [];
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
        exitCode: result.outcome.exitCode,
        failedCommands: result.failedCommands,
        filesChanged: [...result.filesChanged],
        modelMs: result.outcome.modelMs,
        ordinal: index + 1,
        passed: result.outcome.passed,
        sandboxId: result.sandboxId,
        sandboxMs: result.outcome.sandboxMs,
        status: result.outcome.status,
        /* Two distinct moments is the evidence that output arrived as it was
           produced. A provider answering in one piece stamps every event the
           same, and a timeline drawn from that would show work taking no
           time at all. */
        timed: new Set(result.events.map((event) => event.at)).size > 1,
        trajectory: asTrajectory(result.events),
        usage: Option.getOrNull(result.usage),
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
  setup: Option.getOrNull(cell.setup),
  status: cell.status,
  taskIndex: cell.taskIndex,
  trials: asTrials(cell),
});

/** The run's outcome, folded across its cells.
 *
 * Summed here rather than fetched per row: a list screen that showed a pass
 * rate had to read every run in full to render one column. `scored` travels
 * with `passed` because a rate without its denominator is how a provider
 * outage reads as a perfect score. */
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
  ...outcomeOf(state),
  failure: Option.getOrNull(state.failure),
  finishedAt: Option.map(state.finishedAt, DateTime.unsafeMake).pipe(
    Option.getOrNull
  ),
  id: state.id,
  /* The first case names the run, because that is what a person recognises it
     by in a list of five hundred. */
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
  /* The domain knows three harnesses and the API exposes the one that works,
     so the boundary narrows rather than leaking a name a client cannot act
     on. Adding Claude Code widens both, in that order. */
  tasks: state.tasks.map((task) => ({
    harness: "codex" as const,
    harnessVersion: task.harnessVersion,
    model: task.model,
    provider: task.provider,
  })),
});
