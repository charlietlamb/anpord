import type { Database } from "@anpord/db/client";
import { evalCaseVersion } from "@anpord/db/schema/evals/eval-case-versions";
import { evalCase } from "@anpord/db/schema/evals/eval-cases";
import { evalCell } from "@anpord/db/schema/evals/eval-cells";
import { and, desc, eq, inArray } from "drizzle-orm";

export interface CaseScope {
  readonly caseId: string;
  readonly organizationId: string;
}

export const newestCellPerVariant = (db: Database["Type"], scope: CaseScope) =>
  inArray(
    evalCell.internalId,
    db
      .selectDistinctOn([evalCell.cellKey], { internalId: evalCell.internalId })
      .from(evalCell)
      .innerJoin(
        evalCaseVersion,
        eq(evalCaseVersion.internalId, evalCell.caseVersionInternalId)
      )
      .innerJoin(
        evalCase,
        eq(evalCase.internalId, evalCaseVersion.caseInternalId)
      )
      .where(
        and(
          eq(evalCase.id, scope.caseId),
          eq(evalCase.organizationId, scope.organizationId)
        )
      )
      .orderBy(evalCell.cellKey, desc(evalCell.createdAt))
  );
