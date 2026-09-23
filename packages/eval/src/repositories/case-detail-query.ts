import { Database } from "@anpord/db/client";
import { user } from "@anpord/db/schema/auth/users";
import { evalCaseVersion } from "@anpord/db/schema/evals/eval-case-versions";
import { evalCase } from "@anpord/db/schema/evals/eval-cases";
import { evalCell } from "@anpord/db/schema/evals/eval-cells";
import { and, asc, desc, eq } from "drizzle-orm";
import { Effect, Option } from "effect";
import { changesBetween } from "../domain/definition-changes";
import { head, tryStore } from "./query";

export interface CaseVersion {
  readonly author: string | null;
  readonly changes: readonly string[];
  readonly createdAt: Date;
  readonly definitionHash: string;
}

export interface CaseDetail {
  readonly name: string;
  readonly tags: readonly string[];
  readonly versions: readonly CaseVersion[];
}

export interface CaseDetailInput {
  readonly id: string;
  readonly organizationId: string;
}

const VERSION_COLUMNS = {
  author: user.name,
  createdAt: evalCaseVersion.createdAt,
  definitionHash: evalCaseVersion.definitionHash,
  prepareSource: evalCaseVersion.prepareSource,
  repoRef: evalCaseVersion.repoRef,
  repoUrl: evalCaseVersion.repoUrl,
  sourceFiles: evalCaseVersion.sourceFiles,
  sourceKind: evalCaseVersion.sourceKind,
  user: evalCaseVersion.user,
  validatorConfig: evalCaseVersion.validatorConfig,
  validatorSource: evalCaseVersion.validatorSource,
  verifyCommand: evalCaseVersion.verifyCommand,
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
          name: evalCase.name,
          tags: evalCaseVersion.tags,
        })
        .from(evalCase)
        .innerJoin(
          evalCaseVersion,
          eq(evalCaseVersion.caseInternalId, evalCase.internalId)
        )
        .innerJoin(
          evalCell,
          eq(evalCell.caseVersionInternalId, evalCaseVersion.internalId)
        )
        .where(ownedBy(input))
        .orderBy(desc(evalCell.createdAt))
        .limit(1)
    ).pipe(Effect.map(head));

  const versionsOf = (input: CaseDetailInput) =>
    tryStore("runQuery.caseVersions", () =>
      db
        .select(VERSION_COLUMNS)
        .from(evalCase)
        .innerJoin(
          evalCaseVersion,
          eq(evalCaseVersion.caseInternalId, evalCase.internalId)
        )
        .leftJoin(user, eq(user.id, evalCaseVersion.createdBy))
        .where(ownedBy(input))
        .orderBy(asc(evalCaseVersion.createdAt))
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
        name: row.name,
        tags: row.tags ?? [],
        versions,
      });
    }).pipe(Effect.withSpan("RunQuery.findCase"));

  return { findCase };
});
