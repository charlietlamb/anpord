import { Clock, Effect, Option, type Redacted } from "effect";
import { cellKeyOf } from "../domain/cell";
import type {
  EvalStoreError,
  HarnessUnavailable,
  SandboxUnavailable,
} from "../domain/errors";
import { renderPrompt } from "../domain/prompt";
import type { WorkspaceSource } from "../domain/workspace-source";
import type { RunRepositoryShape } from "../repositories/run-repository";
import type { TrialRecorderShape } from "../repositories/trial-record";
import type {
  AgentTrialResult,
  AgentTrialShape,
} from "../services/agent-trial";
import type { GridTask } from "./state";

export interface GridCase {
  readonly goal: string;
  readonly name: string;
  readonly setup: string | null;
  readonly source: WorkspaceSource;
  /** Null for an imported case, whose format carries no verifier. It runs and
   * produces a journal, and its trials are void rather than passed. */
  readonly verify: string | null;
}

export interface RunGridCell {
  readonly agent: AgentTrialShape;
  readonly credentials: Redacted.Redacted<string>;
  readonly onTrial: (
    ordinal: number,
    result: AgentTrialResult
  ) => Effect.Effect<void>;
  readonly prompt: string;
  readonly recorder: TrialRecorderShape;
  readonly runInternalId: string;
  readonly runs: RunRepositoryShape;
  readonly subject: GridCase;
  readonly task: GridTask;
  readonly taskInternalId: string;
  readonly taskPublicId: string;
  readonly trials: number;
}

export interface GridCellResult {
  readonly cellKey: string;
  readonly internalId: string;
}

export const WORKSPACE = "/tmp/anpord-task";
const HOME = "/home/daytona";
const AUTO_STOP_MINUTES = 15;

/** One square of the grid: N trials of one task against one case, recorded. */
export const runGridCell = (
  input: RunGridCell
): Effect.Effect<
  GridCellResult,
  EvalStoreError | HarnessUnavailable | SandboxUnavailable
> =>
  Effect.gen(function* () {
    const cellKey = cellKeyOf({
      harness: input.task.harness,
      harnessVersion: input.task.harnessVersion,
      model: input.task.model,
      provider: input.task.provider,
      taskId: input.taskPublicId,
      taskVersion: input.taskInternalId,
    });

    const cell = yield* input.runs.insertCell({
      cellKey,
      harness: input.task.harness,
      harnessVersion: input.task.harnessVersion,
      model: input.task.model,
      provider: input.task.provider,
      runInternalId: input.runInternalId,
      taskInternalId: input.taskInternalId,
    });

    /* Settled however this ends, including on interrupt. Settling only on
       the success path left cells running forever inside runs already marked
       finished, because an interrupt between recording the trials and the
       final write skipped it and the outer loop carried on. */
    yield* Effect.addFinalizer((exit) =>
      input.runs
        .settleCell({
          internalId: cell.internalId,
          status: exit._tag === "Success" ? "finished" : "failed",
        })
        .pipe(Effect.ignore)
    );

    const results = yield* Effect.all(
      Array.from({ length: input.trials }, (_, index) =>
        input.agent
          .run({
            autoStopMinutes: AUTO_STOP_MINUTES,
            credentials: input.credentials,
            harness: input.task.harness,
            harnessVersion: input.task.harnessVersion,
            home: HOME,
            model: input.task.model,
            prompt: renderPrompt(input.prompt, { goal: input.subject.goal }),
            provider: input.task.provider,
            setupCommand: input.subject.setup,
            source: input.subject.source,
            verifyCommand: input.subject.verify,
            workspace: WORKSPACE,
          })
          .pipe(Effect.tap((result) => input.onTrial(index + 1, result)))
      ),
      { concurrency: input.trials }
    );

    const settledAt = yield* Clock.currentTimeMillis;

    /* Written after the trials rather than as each lands: a recorded trial is
       a fact, and a cell abandoned halfway should not leave settled rows that
       a later comparison would read as evidence. */
    yield* Effect.forEach(
      results,
      (result, index) => {
        const took = result.outcome.modelMs + result.outcome.sandboxMs;

        return input.recorder.record({
          cellInternalId: cell.internalId,
          events: result.events,
          finishedAt: new Date(settledAt),
          ordinal: index + 1,
          outcome: result.outcome,
          provider: input.task.provider,
          sandboxId: result.sandboxId,
          startedAt: new Date(settledAt - took),
          usage: Option.getOrNull(result.usage),
        });
      },
      { discard: true }
    );

    return { cellKey, internalId: cell.internalId };
  }).pipe(
    /* Scoped to this cell, so the settle finalizer runs when the cell ends
       rather than whenever the caller's scope happens to close. */
    Effect.scoped,
    Effect.withSpan("GridCell.run", {
      attributes: {
        harness: input.task.harness,
        provider: input.task.provider,
        trials: input.trials,
      },
    })
  );
