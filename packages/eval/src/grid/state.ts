import type {
  CredentialBindings,
  ResolvedCredential,
} from "@anpord/schema/domain/credentials";
import { Option, type Redacted } from "effect";
import type { HarnessName, ProviderName } from "../domain/cell";
import { type Distribution, distributionOf } from "../domain/distribution";
import type { HarnessEvent } from "../domain/harness-event";
import type { RequestedProfile } from "../domain/harness-profile";
import type { AgentTrialResult } from "../services/agent-trial";

/** A profile as a reader sees it on a task: what a column is labelled with. */
export interface TaskProfile {
  readonly internalId: string;
  readonly name: string;
  readonly version: string;
}

export interface GridTask {
  readonly harness: HarnessName;
  readonly harnessVersion: string;
  readonly model: string;
  readonly profile: TaskProfile | null;
  readonly provider: ProviderName;
}

/* Carries the profile's content rather than its projection, because the row
   naming it is written by the run itself: an intake has read a directory, not
   a version. Registering the content yields the TaskProfile a reader sees. */
export interface GridExecutionTask {
  readonly bindings?: CredentialBindings;
  readonly credentials: {
    readonly harness: Redacted.Redacted<ResolvedCredential>;
    readonly sandbox?: Redacted.Redacted<ResolvedCredential>;
  };
  readonly harness: HarnessName;
  readonly harnessVersion: string;
  readonly model: string;
  readonly profile: RequestedProfile | null;
  readonly provider: ProviderName;
}

/** A task as a reader sees it, once the run's profiles have their rows. */
export const projectTask = (
  task: GridExecutionTask,
  profile: TaskProfile | null
): GridTask => ({
  harness: task.harness,
  harnessVersion: task.harnessVersion,
  model: task.model,
  profile,
  provider: task.provider,
});

export interface GridSetup {
  readonly prepareName: string | null;
  readonly prompt: string;
  readonly repoRef: string | null;
  readonly repoUrl: string | null;
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
  readonly name: string | null;
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
