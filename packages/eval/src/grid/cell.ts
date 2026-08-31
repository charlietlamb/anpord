import type { EvalPrepare, EvalValidator } from "@anpord/schema/domain/evals";
import { Effect, Redacted } from "effect";
import { cellKeyOf } from "../domain/cell";
import type {
  EvalStoreError,
  HarnessUnavailable,
  PrepareFailed,
  SandboxUnavailable,
  SourceUnavailable,
} from "../domain/errors";
import { renderPrompt } from "../domain/prompt";
import type { WorkspaceSource } from "../domain/workspace-source";
import type { ModelPrices } from "../ports/model-source";
import type { RunRepositoryShape } from "../repositories/run-repository";
import { runTrial, type TrialInputs } from "./trial";

export interface GridCase {
  readonly identity?: string;
  readonly name: string;
  readonly prepare: EvalPrepare | null;
  readonly source: WorkspaceSource;

  readonly validator?: EvalValidator | null;
  readonly variables: Readonly<Record<string, string>>;
  readonly verify: string | null;
}

export interface RunGridCell extends TrialInputs {
  readonly runInternalId: string;
  readonly runs: RunRepositoryShape;
  readonly taskInternalId: string;
  readonly taskPublicId: string;
  readonly trials: number;
}

export interface GridCellResult {
  readonly cellKey: string;
  readonly internalId: string;
}

export const runGridCell = (
  input: RunGridCell
): Effect.Effect<
  GridCellResult,
  | EvalStoreError
  | HarnessUnavailable
  | SandboxUnavailable
  | PrepareFailed
  | SourceUnavailable,
  ModelPrices
> =>
  Effect.gen(function* () {
    const harnessCredential = Redacted.value(input.task.credentials.harness);
    const sandboxCredential = input.task.credentials.sandbox;
    const harnessConnectionId = input.task.bindings?.harnessConnectionId;
    const sandboxConnectionId = input.task.bindings?.sandboxConnectionId;
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
      harnessCredentialConnectionId: harnessConnectionId,
      harnessCredentialRevision:
        harnessConnectionId === undefined
          ? undefined
          : harnessCredential.revision,
      harnessVersion: input.task.harnessVersion,
      model: input.task.model,
      prompt: renderPrompt(input.prompt, input.subject.variables),
      provider: input.task.provider,
      runInternalId: input.runInternalId,
      sandboxCredentialConnectionId: sandboxConnectionId,
      sandboxCredentialRevision:
        sandboxCredential === undefined || sandboxConnectionId === undefined
          ? undefined
          : Redacted.value(sandboxCredential).revision,
      taskInternalId: input.taskInternalId,
    });

    yield* Effect.addFinalizer((exit) =>
      input.runs
        .settleCell({
          internalId: cell.internalId,
          status: exit._tag === "Success" ? "finished" : "failed",
        })
        .pipe(Effect.ignore)
    );

    yield* Effect.all(
      Array.from({ length: input.trials }, (_, index) =>
        runTrial({
          ...input,
          cellInternalId: cell.internalId,
          ordinal: index + 1,
        })
      ),
      { concurrency: input.trials }
    );

    return { cellKey, internalId: cell.internalId };
  }).pipe(
    Effect.scoped,
    Effect.withSpan("GridCell.run", {
      attributes: {
        harness: input.task.harness,
        provider: input.task.provider,
        trials: input.trials,
      },
    })
  );
