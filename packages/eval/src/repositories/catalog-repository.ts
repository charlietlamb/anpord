import { Database } from "@anpord/db/client";
import { evalCaseVersion } from "@anpord/db/schema/evals/eval-case-versions";
import { evalCase } from "@anpord/db/schema/evals/eval-cases";
import { evalSuite } from "@anpord/db/schema/evals/eval-suites";
import { evalVariant } from "@anpord/db/schema/evals/eval-variants";
import { IdGenerator } from "@anpord/ids/id";
import type { EvalSuiteRequest } from "@anpord/schema/domain/evals";
import { Context, Effect, Layer } from "effect";
import type { CaseDefinition } from "../domain/case-identity";
import type { EvalStoreError } from "../domain/errors";
import type { VariantIdentity } from "../domain/variant";
import { tryStore } from "./query";

export interface CatalogCase extends CaseDefinition {
  readonly definitionHash: string;
  readonly id: string;
  readonly name: string;
  readonly tags: readonly string[];
  readonly variants: readonly VariantIdentity[];
}

export interface RegisterCatalog {
  readonly cases: readonly CatalogCase[];
  readonly createdBy: string | null;
  readonly organizationId: string;
  readonly suite: Pick<EvalSuiteRequest, "id" | "name">;
}

export interface RegisteredCase {
  readonly caseInternalId: string;
  readonly caseVersionInternalId: string;
  readonly variantInternalIds: readonly string[];
}

export interface CatalogRepositoryShape {
  readonly register: (
    input: RegisterCatalog
  ) => Effect.Effect<readonly RegisteredCase[], EvalStoreError>;
}

export class CatalogRepository extends Context.Tag(
  "@anpord/eval/CatalogRepository"
)<CatalogRepository, CatalogRepositoryShape>() {}

const only = <A>(rows: readonly A[], what: string): A => {
  const row = rows.at(0);
  if (row === undefined) {
    throw new Error(`${what} was neither written nor found`);
  }
  return row;
};

export const CatalogRepositoryLive = Layer.effect(
  CatalogRepository,
  Effect.gen(function* () {
    const db = yield* Database;
    const ids = yield* IdGenerator;

    const idsFor = (input: RegisterCatalog) =>
      Effect.all({
        cases: Effect.forEach(input.cases, (subject) =>
          Effect.all({
            case: ids.generate("evalCase"),
            variants: Effect.forEach(subject.variants, () =>
              ids.generate("evalVariant")
            ),
            version: ids.generate("evalCaseVersion"),
          })
        ),
        suite: ids.generate("evalSuite"),
      });

    const register = (input: RegisterCatalog) =>
      Effect.gen(function* () {
        const fresh = yield* idsFor(input);

        return yield* tryStore("catalog.register", () =>
          db.transaction(async (tx) => {
            const suite = only(
              await tx
                .insert(evalSuite)
                .values({
                  id: input.suite.id,
                  internalId: fresh.suite,
                  name: input.suite.name,
                  organizationId: input.organizationId,
                })
                .onConflictDoUpdate({
                  set: { name: input.suite.name },
                  target: [evalSuite.organizationId, evalSuite.id],
                })
                .returning({ internalId: evalSuite.internalId }),
              `suite ${input.suite.id}`
            );

            const registered: RegisteredCase[] = [];

            for (const [index, subject] of input.cases.entries()) {
              const id = fresh.cases[index];
              if (id === undefined) {
                continue;
              }

              const row = only(
                await tx
                  .insert(evalCase)
                  .values({
                    id: subject.id,
                    internalId: id.case,
                    name: subject.name,
                    organizationId: input.organizationId,
                    suiteInternalId: suite.internalId,
                  })
                  .onConflictDoUpdate({
                    set: {
                      name: subject.name,
                      suiteInternalId: suite.internalId,
                    },
                    target: [evalCase.organizationId, evalCase.id],
                  })
                  .returning({ internalId: evalCase.internalId }),
                `case ${subject.id}`
              );

              const version = only(
                await tx
                  .insert(evalCaseVersion)
                  .values({
                    cache: subject.cache,
                    caseInternalId: row.internalId,
                    createdBy: input.createdBy,
                    definitionHash: subject.definitionHash,
                    internalId: id.version,
                    prepare: subject.prepare,
                    prompt: subject.prompt,
                    source: subject.source,
                    tags: subject.tags,
                    user: subject.user,
                    validator: subject.validator,
                    verify: subject.verify,
                  })
                  .onConflictDoUpdate({
                    set: { tags: subject.tags, validator: subject.validator },
                    target: [
                      evalCaseVersion.caseInternalId,
                      evalCaseVersion.definitionHash,
                    ],
                  })
                  .returning({ internalId: evalCaseVersion.internalId }),
                `case version ${subject.definitionHash}`
              );

              const variantInternalIds: string[] = [];

              for (const [position, variant] of subject.variants.entries()) {
                const stored = only(
                  await tx
                    .insert(evalVariant)
                    .values({
                      caseInternalId: row.internalId,
                      harness: variant.harness,
                      internalId: id.variants[position] ?? "",
                      model: variant.model,
                      profile: variant.profile,
                      sandbox: variant.sandbox,
                      userModel: variant.userModel,
                    })
                    .onConflictDoUpdate({
                      set: { model: variant.model },
                      target: [
                        evalVariant.caseInternalId,
                        evalVariant.harness,
                        evalVariant.model,
                        evalVariant.sandbox,
                        evalVariant.profile,
                        evalVariant.userModel,
                      ],
                    })
                    .returning({ internalId: evalVariant.internalId }),
                  `variant ${variant.harness} ${variant.model}`
                );
                variantInternalIds.push(stored.internalId);
              }

              registered.push({
                caseInternalId: row.internalId,
                caseVersionInternalId: version.internalId,
                variantInternalIds,
              });
            }

            return registered;
          })
        );
      }).pipe(
        Effect.withSpan("CatalogRepository.register", {
          attributes: { cases: input.cases.length },
        }),
        Effect.annotateLogs({ organizationId: input.organizationId })
      );

    return CatalogRepository.of({ register });
  })
);
