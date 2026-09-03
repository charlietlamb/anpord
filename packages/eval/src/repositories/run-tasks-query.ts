import { Database } from "@anpord/db/client";
import { evalCell } from "@anpord/db/schema/evals/eval-cells";
import { evalHarnessProfile } from "@anpord/db/schema/evals/eval-harness-profiles";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalTask } from "@anpord/db/schema/evals/eval-tasks";
import { and, eq, type SQL } from "drizzle-orm";
import { Effect } from "effect";
import type { WorkspaceSource } from "../domain/workspace-source";
import { head, tryStore } from "./query";

type CellRow = typeof evalCell.$inferSelect;
type TaskSource = Pick<
  typeof evalTask.$inferSelect,
  "repoRef" | "repoUrl" | "sourceFiles" | "sourceKind"
>;

const sourceOf = (row: TaskSource): WorkspaceSource | null => {
  if (row.sourceKind === "empty") {
    return { kind: "empty" };
  }

  if (row.sourceKind === "files" && row.sourceFiles !== null) {
    return { files: row.sourceFiles, kind: "files" };
  }

  if (row.sourceKind === "repo" && row.repoUrl !== null) {
    return { kind: "repo", ref: row.repoRef, url: row.repoUrl };
  }

  return null;
};

/* The profile row a cell ran under, joined back so a rebuilt run writes its
   files again and a reader can label the column. */
type CellProfile = typeof evalHarnessProfile.$inferSelect;

export interface CellTask {
  readonly cacheKey: string | null;
  readonly cachePath: string | null;
  readonly cell: CellRow;
  readonly identity: string;
  readonly name: string;
  readonly prepareName: string | null;
  readonly prepareSource: string | null;
  readonly profile: CellProfile | null;
  readonly prompt: string;
  readonly repoRef: string | null;
  readonly repoUrl: string | null;
  readonly runName: string | null;
  readonly source: WorkspaceSource | null;
  readonly validatorName?: string | null;
  readonly validatorSource?: string | null;
  readonly verifyCommand: string | null;
}

export interface RunTasksInput {
  readonly organizationId: string;
  readonly runId: string;
}

export interface CellTaskInput {
  readonly cellKey: string;
  readonly organizationId: string;
  readonly runId: string;
}

const CELL_TASK_COLUMNS = {
  cacheKey: evalTask.cacheKey,
  cachePath: evalTask.cachePath,
  cell: evalCell,
  identity: evalTask.id,
  name: evalTask.name,
  prepareName: evalTask.prepareName,
  prepareSource: evalTask.prepareSource,
  profile: evalHarnessProfile,
  prompt: evalCell.prompt,
  repoRef: evalTask.repoRef,
  repoUrl: evalTask.repoUrl,
  runName: evalRun.name,
  sourceFiles: evalTask.sourceFiles,
  sourceKind: evalTask.sourceKind,
  validatorName: evalTask.validatorName,
  validatorSource: evalTask.validatorSource,
  verifyCommand: evalTask.verifyCommand,
};

export const runTasksQuery = Effect.map(Database, (db) => {
  const cellTasksWhere = (condition: SQL | undefined) =>
    tryStore("runQuery.cellTasks", () =>
      db
        .select(CELL_TASK_COLUMNS)
        .from(evalCell)
        .innerJoin(evalTask, eq(evalCell.taskInternalId, evalTask.internalId))
        .innerJoin(evalRun, eq(evalCell.runInternalId, evalRun.internalId))
        .leftJoin(
          evalHarnessProfile,
          eq(evalCell.profileInternalId, evalHarnessProfile.internalId)
        )
        .where(condition)
    ).pipe(
      Effect.map((rows) =>
        rows.map((row): CellTask => ({ ...row, source: sourceOf(row) }))
      )
    );

  return {
    findCellTask: (input: CellTaskInput) =>
      cellTasksWhere(
        and(
          eq(evalCell.cellKey, input.cellKey),
          eq(evalRun.id, input.runId),
          eq(evalRun.organizationId, input.organizationId)
        )
      ).pipe(Effect.map(head), Effect.withSpan("RunQuery.findCellTask")),
    findRunTasks: (input: RunTasksInput) =>
      cellTasksWhere(
        and(
          eq(evalRun.id, input.runId),
          eq(evalRun.organizationId, input.organizationId)
        )
      ).pipe(Effect.withSpan("RunQuery.findRunTasks")),
  };
});
