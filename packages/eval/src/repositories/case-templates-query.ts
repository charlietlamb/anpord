import { Database } from "@sphynx/db/client";
import { evalCase } from "@sphynx/db/schema/evals/eval-cases";
import { evalRun } from "@sphynx/db/schema/evals/eval-runs";
import { evalVariant } from "@sphynx/db/schema/evals/eval-variants";
import { and, desc, eq, inArray } from "drizzle-orm";
import { Effect, Option } from "effect";
import { type RunTemplate, templateOf } from "../domain/run-template";
import { tryStore } from "./query";

export interface CaseTemplates {
  readonly caseVersionInternalId: string;
  readonly runs: readonly RunTemplate[];
}

export const caseTemplatesQuery = Effect.gen(function* () {
  const db = yield* Database;

  return (input: {
    readonly caseId: string;
    readonly organizationId: string;
    readonly variantIds: readonly string[] | null;
  }) =>
    Effect.gen(function* () {
      const scope = and(
        eq(evalCase.organizationId, input.organizationId),
        eq(evalCase.id, input.caseId)
      );

      const [version] = yield* tryStore("caseTemplates.version", () =>
        db
          .select({ internalId: evalRun.caseVersionInternalId })
          .from(evalRun)
          .innerJoin(
            evalVariant,
            eq(evalVariant.internalId, evalRun.variantInternalId)
          )
          .innerJoin(
            evalCase,
            eq(evalCase.internalId, evalVariant.caseInternalId)
          )
          .where(scope)
          .orderBy(desc(evalRun.createdAt), desc(evalRun.internalId))
          .limit(1)
      );

      if (version === undefined) {
        return Option.none<CaseTemplates>();
      }

      const rows = yield* tryStore("caseTemplates.runs", () =>
        db
          .selectDistinctOn([evalRun.variantInternalId], {
            run: evalRun,
            variant: evalVariant,
          })
          .from(evalRun)
          .innerJoin(
            evalVariant,
            eq(evalVariant.internalId, evalRun.variantInternalId)
          )
          .innerJoin(
            evalCase,
            eq(evalCase.internalId, evalVariant.caseInternalId)
          )
          .where(
            input.variantIds === null
              ? scope
              : and(scope, inArray(evalVariant.internalId, input.variantIds))
          )
          .orderBy(evalRun.variantInternalId, desc(evalRun.createdAt))
      );

      return Option.some<CaseTemplates>({
        caseVersionInternalId: version.internalId,
        runs: rows.flatMap((row) => Option.toArray(templateOf(row))),
      });
    }).pipe(
      Effect.withSpan("CaseTemplatesQuery.find", {
        attributes: { caseId: input.caseId },
      })
    );
});
