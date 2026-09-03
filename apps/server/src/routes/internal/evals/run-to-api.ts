import { rollUp } from "@anpord/eval/domain/eval-costs";
import type { GridRunState } from "@anpord/eval/grid/state";
import type { CellComparison } from "@anpord/eval/services/baselines";
import type { EvalRun, EvalRunSummary } from "@anpord/schema/domain/evals";
import { DateTime, Option } from "effect";
import { asCell } from "./cell-to-api";

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
  firstCaseName: state.cases[0] ?? null,
  id: state.id,

  name: state.name,
  startedAt: DateTime.unsafeMake(state.startedAt),
  status: state.status,
  taskCount: state.tasks.length,
});

export const detail = (
  state: GridRunState,
  comparisons: readonly CellComparison[]
): EvalRun => {
  const cells = state.cells.map((cell) => asCell(cell, comparisons));

  return {
    cases: [...state.cases],
    cells,
    costs: rollUp(cells.map((cell) => cell.costs)),
    failure: Option.getOrNull(state.failure),
    finishedAt: Option.map(state.finishedAt, DateTime.unsafeMake).pipe(
      Option.getOrNull
    ),
    id: state.id,
    name: state.name,
    startedAt: DateTime.unsafeMake(state.startedAt),
    status: state.status,

    tasks: state.tasks.map((task) => ({
      harness: task.harness,
      harnessVersion: task.harnessVersion,
      model: task.model,
      profile:
        task.profile === null
          ? null
          : { name: task.profile.name, version: task.profile.version },
      provider: task.provider,
    })),
  };
};
