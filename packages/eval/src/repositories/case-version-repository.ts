import { Database } from "@anpord/db/client";
import { evalCaseVersion } from "@anpord/db/schema/evals/eval-case-versions";
import { IdGenerator } from "@anpord/ids/id";
import type { EvalUser } from "@anpord/schema/domain/eval-turns";
import type { EvalPrepare, EvalValidator } from "@anpord/schema/domain/evals";
import { eq } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";
import type { EvalStoreError } from "../domain/errors";
import type { WorkspaceSource } from "../domain/workspace-source";
import { tryStore } from "./query";

type CaseVersionRow = typeof evalCaseVersion.$inferSelect;

interface CaseVersionDefinition {
  readonly cache?: { readonly key: string; readonly path: string };
  readonly caseInternalId: string;
  readonly createdBy: string | null;
  readonly name: string;
  readonly organizationId: string;
  readonly prepare: EvalPrepare | null;
  readonly prompt: string;
  readonly source: WorkspaceSource;
  readonly tags?: readonly string[] | null;
  readonly user?: EvalUser | null;
  readonly validator: EvalValidator | null;
  readonly verifyCommand: string | null;
  readonly workspace: string;
}

export interface CaseVersionRepositoryShape {
  readonly list: (
    organizationId: string
  ) => Effect.Effect<readonly CaseVersionRow[], EvalStoreError>;

  readonly upsertByDefinition: (
    input: CaseVersionDefinition & {
      readonly definitionHash: string;
    }
  ) => Effect.Effect<CaseVersionRow, EvalStoreError>;
}

export class CaseVersionRepository extends Context.Tag(
  "@anpord/eval/CaseVersionRepository"
)<CaseVersionRepository, CaseVersionRepositoryShape>() {}

const definitionOf = (input: CaseVersionDefinition) => ({
  cacheKey: input.cache?.key ?? null,
  cachePath: input.cache?.path ?? null,
  name: input.name,
  prompt: input.prompt,
  repoRef: input.source.kind === "repo" ? input.source.ref : null,
  repoUrl: input.source.kind === "repo" ? input.source.url : null,
  prepareName: input.prepare?.name ?? null,
  prepareSource: input.prepare?.source ?? null,
  sourceFiles: input.source.kind === "files" ? input.source.files : null,
  sourceKind: input.source.kind,
  validatorName: input.validator?.name ?? null,
  validatorSource:
    input.validator != null && "source" in input.validator
      ? input.validator.source
      : null,
  tags: input.tags ?? null,
  user: input.user ?? null,
  validatorConfig: input.validator,
  verifyCommand: input.verifyCommand,
  workspace: input.workspace,
});

export const CaseVersionRepositoryLive = Layer.effect(
  CaseVersionRepository,
  Effect.gen(function* () {
    const db = yield* Database;
    const ids = yield* IdGenerator;

    return CaseVersionRepository.of({
      upsertByDefinition: (input) =>
        Effect.gen(function* () {
          const internalId = yield* ids.generate("evalCaseVersion");

          const rows = yield* tryStore("caseVersion.upsertByDefinition", () =>
            db
              .insert(evalCaseVersion)
              .values({
                ...definitionOf(input),
                caseInternalId: input.caseInternalId,
                createdBy: input.createdBy,
                definitionHash: input.definitionHash,
                internalId,
                organizationId: input.organizationId,
              })

              .onConflictDoUpdate({
                set: { name: input.name },
                target: [
                  evalCaseVersion.caseInternalId,
                  evalCaseVersion.definitionHash,
                ],
              })
              .returning()
          );

          const row = rows.at(0);

          return row === undefined
            ? yield* Effect.dieMessage(
                `case version ${input.definitionHash} was neither written nor found`
              )
            : row;
        }).pipe(Effect.withSpan("CaseVersionRepository.upsertByDefinition")),

      list: (organizationId) =>
        tryStore("caseVersion.list", () =>
          db
            .select()
            .from(evalCaseVersion)
            .where(eq(evalCaseVersion.organizationId, organizationId))
        ).pipe(Effect.withSpan("CaseVersionRepository.list")),
    });
  })
);
