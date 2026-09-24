import { Database } from "@anpord/db/client";
import { evalCaseVersion } from "@anpord/db/schema/evals/eval-case-versions";
import { evalCase } from "@anpord/db/schema/evals/eval-cases";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalVariant } from "@anpord/db/schema/evals/eval-variants";
import { and, desc, eq } from "drizzle-orm";
import { Effect, Option } from "effect";
import type { HarnessName, SandboxName } from "../domain/variant";
import { namesOf } from "../domain/variant";
import { tryStore } from "./query";

interface RunTemplate {
  readonly harness: HarnessName;
  readonly harnessCredentialConnectionId: string | null;
  readonly harnessVersion: string;
  readonly profileInternalId: string | null;
  readonly sandbox: SandboxName;
  readonly sandboxCredentialConnectionId: string | null;
  readonly variantInternalId: string;
}

export interface CaseTemplates {
  readonly caseVersionInternalId: string;
  readonly runs: readonly RunTemplate[];
}

export const caseTemplatesQuery = Effect.gen(function* () {
  const db = yield* Database;

  return (input: {
    readonly caseId: string;
    readonly organizationId: string;
    readonly variantId: string | null;
  }) =>
    Effect.gen(function* () {
      const scope = and(
        eq(evalCase.organizationId, input.organizationId),
        eq(evalCase.id, input.caseId)
      );

      const [version] = yield* tryStore("caseTemplates.version", () =>
        db
          .select({ internalId: evalCaseVersion.internalId })
          .from(evalCaseVersion)
          .innerJoin(
            evalCase,
            eq(evalCase.internalId, evalCaseVersion.caseInternalId)
          )
          .where(scope)
          .orderBy(desc(evalCaseVersion.createdAt))
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
            input.variantId === null
              ? scope
              : and(scope, eq(evalVariant.internalId, input.variantId))
          )
          .orderBy(evalRun.variantInternalId, desc(evalRun.createdAt))
      );

      return Option.some<CaseTemplates>({
        caseVersionInternalId: version.internalId,
        runs: rows.flatMap((row) =>
          Option.match(namesOf(row.variant), {
            onNone: () => [],
            onSome: (names) => [
              {
                harness: names.harness,
                harnessCredentialConnectionId:
                  row.run.harnessCredentialConnectionId,
                harnessVersion: row.run.harnessVersion,
                profileInternalId: row.run.profileInternalId,
                sandbox: names.sandbox,
                sandboxCredentialConnectionId:
                  row.run.sandboxCredentialConnectionId,
                variantInternalId: row.variant.internalId,
              },
            ],
          })
        ),
      });
    }).pipe(
      Effect.withSpan("CaseTemplatesQuery.find", {
        attributes: { caseId: input.caseId },
      })
    );
});
