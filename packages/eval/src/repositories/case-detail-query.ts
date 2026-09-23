import { Database } from "@anpord/db/client";
import { user } from "@anpord/db/schema/auth/users";
import { evalCase } from "@anpord/db/schema/evals/eval-cases";
import { evalCell } from "@anpord/db/schema/evals/eval-cells";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalTask } from "@anpord/db/schema/evals/eval-tasks";
import { and, asc, desc, eq } from "drizzle-orm";
import { Effect, Option } from "effect";
import { CellKey } from "../domain/cell";
import { changesBetween } from "../domain/definition-changes";
import { head, tryStore } from "./query";

export interface CaseVersion {
  readonly author: string | null;
  readonly changes: readonly string[];
  readonly createdAt: Date;
  readonly definitionHash: string;
}

export interface CaseDetail {
  readonly cellKey: CellKey;
  readonly lastRunId: string;
  readonly name: string;
  readonly suite: string | null;
  readonly tags: readonly string[];
  readonly versions: readonly CaseVersion[];
}

export interface CaseDetailInput {
  readonly id: string;
  readonly organizationId: string;
}

const VERSION_COLUMNS = {
  author: user.name,
  createdAt: evalTask.createdAt,
  definitionHash: evalTask.definitionHash,
  prepareSource: evalTask.prepareSource,
  repoRef: evalTask.repoRef,
  repoUrl: evalTask.repoUrl,
  sourceFiles: evalTask.sourceFiles,
  sourceKind: evalTask.sourceKind,
  user: evalTask.user,
  validatorConfig: evalTask.validatorConfig,
  validatorSource: evalTask.validatorSource,
  verifyCommand: evalTask.verifyCommand,
};

export const caseDetailQuery = Effect.gen(function* () {
  const db = yield* Database;

  const ownedBy = (input: CaseDetailInput) =>
    and(
      eq(evalCase.id, input.id),
      eq(evalCase.organizationId, input.organizationId)
    );

  const newestReading = (input: CaseDetailInput) =>
    tryStore("runQuery.findCase", () =>
      db
        .select({
          cellKey: evalCell.cellKey,
          lastRunId: evalRun.id,
          name: evalCase.name,
          suite: evalRun.name,
          tags: evalTask.tags,
        })
        .from(evalCase)
        .innerJoin(evalTask, eq(evalTask.caseInternalId, evalCase.internalId))
        .innerJoin(evalCell, eq(evalCell.taskInternalId, evalTask.internalId))
        .innerJoin(evalRun, eq(evalRun.internalId, evalCell.runInternalId))
        .where(ownedBy(input))
        .orderBy(desc(evalCell.createdAt))
        .limit(1)
    ).pipe(Effect.map(head));

  const versionsOf = (input: CaseDetailInput) =>
    tryStore("runQuery.caseVersions", () =>
      db
        .select(VERSION_COLUMNS)
        .from(evalCase)
        .innerJoin(evalTask, eq(evalTask.caseInternalId, evalCase.internalId))
        .leftJoin(user, eq(user.id, evalTask.createdBy))
        .where(ownedBy(input))
        .orderBy(asc(evalTask.createdAt))
    ).pipe(
      Effect.map((rows) =>
        rows.map(
          (row, index): CaseVersion => ({
            author: row.author,
            changes:
              index === 0 ? [] : changesBetween(rows[index - 1] ?? row, row),
            createdAt: row.createdAt,
            definitionHash: row.definitionHash,
          })
        )
      )
    );

  const findCase = (input: CaseDetailInput) =>
    Effect.gen(function* () {
      const reading = yield* newestReading(input);

      if (Option.isNone(reading)) {
        return Option.none<CaseDetail>();
      }

      const row = reading.value;
      const versions = yield* versionsOf(input);

      return Option.some<CaseDetail>({
        cellKey: CellKey.make(row.cellKey),
        lastRunId: row.lastRunId,
        name: row.name,
        suite: row.suite,
        tags: row.tags ?? [],
        versions,
      });
    }).pipe(Effect.withSpan("RunQuery.findCase"));

  return { findCase };
});
