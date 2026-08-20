import { Option } from "effect";
import type { HarnessName, ProviderName } from "../domain/cell";
import { type Distribution, distributionOf } from "../domain/distribution";
import type { AgentTrialResult } from "./agent-trial";

export interface GridTask {
  readonly harness: HarnessName;
  readonly harnessVersion: string;
  readonly model: string;
  readonly provider: ProviderName;
}

export interface GridCell {
  readonly caseName: string;
  readonly cellKey: string | null;
  readonly distribution: Option.Option<Distribution>;
  readonly internalId: string | null;
  readonly status: "running" | "finished" | "failed";
  readonly taskIndex: number;
  readonly trials: readonly Option.Option<AgentTrialResult>[];
}

export interface GridRunState {
  readonly cases: readonly string[];
  readonly cells: readonly GridCell[];
  readonly failure: Option.Option<string>;
  readonly finishedAt: Option.Option<number>;
  readonly id: string;
  readonly organizationId: string;
  readonly startedAt: number;
  readonly status: "running" | "finished" | "failed";
  readonly tasks: readonly GridTask[];
}

export const cellKeyOfPosition = (taskIndex: number, caseName: string) =>
  `${taskIndex}:${caseName}`;

const at = (cell: GridCell, taskIndex: number, caseName: string) =>
  cellKeyOfPosition(cell.taskIndex, cell.caseName) ===
  cellKeyOfPosition(taskIndex, caseName);

/** Transitions over the live view, kept as calculations so the service holds
 * only the effects. Each returns a whole run because every subscriber is sent
 * the whole run: a dropped frame then costs nothing. */
export const settleTrial = (
  run: GridRunState,
  position: { readonly caseName: string; readonly taskIndex: number },
  ordinal: number,
  result: AgentTrialResult
): GridRunState => ({
  ...run,
  cells: run.cells.map((cell) =>
    at(cell, position.taskIndex, position.caseName)
      ? {
          ...cell,
          trials: cell.trials.map((trial, index) =>
            index === ordinal - 1 ? Option.some(result) : trial
          ),
        }
      : cell
  ),
});

export const completeCell = (
  run: GridRunState,
  position: { readonly caseName: string; readonly taskIndex: number },
  identity: { readonly cellKey: string; readonly internalId: string }
): GridRunState => ({
  ...run,
  cells: run.cells.map((cell) => {
    if (!at(cell, position.taskIndex, position.caseName)) {
      return cell;
    }

    const outcomes = cell.trials.flatMap((trial) =>
      Option.match(trial, {
        onNone: () => [],
        onSome: (result) => [result.outcome],
      })
    );

    return {
      ...cell,
      cellKey: identity.cellKey,
      distribution: Option.some(distributionOf(outcomes)),
      internalId: identity.internalId,
      status: "finished" as const,
    };
  }),
});
