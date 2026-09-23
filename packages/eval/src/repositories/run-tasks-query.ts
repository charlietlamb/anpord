import { Database } from "@anpord/db/client";
import { evalCaseVersion } from "@anpord/db/schema/evals/eval-case-versions";
import { evalCase } from "@anpord/db/schema/evals/eval-cases";
import { evalCell } from "@anpord/db/schema/evals/eval-cells";
import { evalHarnessProfile } from "@anpord/db/schema/evals/eval-harness-profiles";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import type { EvalTrigger } from "@anpord/schema/domain/eval-trigger";
import { and, eq, type SQL, sql } from "drizzle-orm";
import { Effect } from "effect";
import type { WorkspaceSource } from "../domain/workspace-source";
import { type CaseScope, newestCellPerVariant } from "./case-variants";
import { head, tryStore } from "./query";

type CellRow = typeof evalCell.$inferSelect;
type TaskSource = Pick<
  typeof evalCaseVersion.$inferSelect,
  "repoRef" | "repoUrl" | "sourceFiles" | "sourceKind"
>;

const resolveSource = (row: TaskSource): WorkspaceSource | null => {
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
  readonly caseInternalId: string;
  readonly cell: CellRow;
  readonly definitionHash: string;
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
  readonly trialsPerCell: number;
  readonly trigger: EvalTrigger | null;
  readonly user?: unknown;
  readonly validatorConfig?: unknown;
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
  trigger: evalRun.trigger,
  cacheKey: evalCaseVersion.cacheKey,
  cachePath: evalCaseVersion.cachePath,
  caseInternalId: evalCaseVersion.caseInternalId,
  cell: evalCell,
  definitionHash: evalCaseVersion.definitionHash,
  identity: evalCase.id,
  name: evalCaseVersion.name,
  prepareName: evalCaseVersion.prepareName,
  prepareSource: evalCaseVersion.prepareSource,
  profile: evalHarnessProfile,
  prompt: evalCell.prompt,
  repoRef: evalCaseVersion.repoRef,
  repoUrl: evalCaseVersion.repoUrl,
  runName: evalRun.name,
  sourceFiles: evalCaseVersion.sourceFiles,
  sourceKind: evalCaseVersion.sourceKind,
  trialsPerCell: sql<number>`${evalRun.trialCount} / ${evalRun.cellCount}`,
  validatorName: evalCaseVersion.validatorName,
  validatorSource: evalCaseVersion.validatorSource,
  user: evalCaseVersion.user,
  validatorConfig: evalCaseVersion.validatorConfig,
  verifyCommand: evalCaseVersion.verifyCommand,
};

export const runTasksQuery = Effect.map(Database, (db) => {
  const cellTasksWhere = (condition: SQL | undefined) =>
    tryStore("runQuery.cellTasks", () =>
      db
        .select(CELL_TASK_COLUMNS)
        .from(evalCell)
        .innerJoin(
          evalCaseVersion,
          eq(evalCell.caseVersionInternalId, evalCaseVersion.internalId)
        )
        .innerJoin(
          evalCase,
          eq(evalCaseVersion.caseInternalId, evalCase.internalId)
        )
        .innerJoin(evalRun, eq(evalCell.runInternalId, evalRun.internalId))
        .leftJoin(
          evalHarnessProfile,
          eq(evalCell.profileInternalId, evalHarnessProfile.internalId)
        )
        .where(condition)
    ).pipe(
      Effect.map((rows) =>
        rows.map((row): CellTask => ({ ...row, source: resolveSource(row) }))
      )
    );

  return {
    findCaseTasks: (scope: CaseScope) =>
      cellTasksWhere(newestCellPerVariant(db, scope)).pipe(
        Effect.map((rows) =>
          [...rows].sort(
            (left, right) =>
              right.cell.createdAt.getTime() - left.cell.createdAt.getTime()
          )
        ),
        Effect.withSpan("RunQuery.findCaseTasks")
      ),
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
