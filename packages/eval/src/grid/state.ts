import type {
  CredentialBindings,
  ResolvedCredential,
} from "@anpord/schema/domain/credentials";
import { Option, type Redacted } from "effect";
import type { HarnessName, ProviderName } from "../domain/cell";
import { type Distribution, distributionOf } from "../domain/distribution";
import type { HarnessEvent } from "../domain/harness-event";
import type { AgentTrialResult } from "../services/agent-trial";

export interface GridTask {
  readonly harness: HarnessName;
  readonly harnessVersion: string;
  readonly model: string;
  readonly provider: ProviderName;
}

export interface GridExecutionTask extends GridTask {
  readonly bindings?: CredentialBindings;
  readonly credentials: {
    readonly harness: Redacted.Redacted<ResolvedCredential>;
    readonly sandbox?: Redacted.Redacted<ResolvedCredential>;
  };
}

export interface GridSetup {
  readonly prompt: string;
  readonly repoRef: string | null;
  readonly repoUrl: string | null;
  readonly setupCommand: string | null;
  readonly validatorName: string | null;
  readonly verifyCommand: string | null;
  readonly workspace: string;
}

export interface GridCell {
  readonly caseName: string;
  readonly cellKey: string | null;
  readonly distribution: Option.Option<Distribution>;
  readonly internalId: string | null;

  readonly live: ReadonlyMap<number, readonly HarnessEvent[]>;

  readonly setup: Option.Option<GridSetup>;
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

export const advanceTrial = (
  run: GridRunState,
  position: { readonly caseName: string; readonly taskIndex: number },
  ordinal: number,
  events: readonly HarnessEvent[]
): GridRunState => ({
  ...run,
  cells: run.cells.map((cell) =>
    at(cell, position.taskIndex, position.caseName)
      ? { ...cell, live: new Map(cell.live).set(ordinal, events) }
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
