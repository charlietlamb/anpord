import { Database } from "@anpord/db/client";
import { evalTask } from "@anpord/db/schema/evals/eval-tasks";
import { IdGenerator } from "@anpord/ids/id";
import type { EvalUser } from "@anpord/schema/domain/eval-turns";
import type { EvalPrepare, EvalValidator } from "@anpord/schema/domain/evals";
import { eq } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";
import type { EvalStoreError } from "../domain/errors";
import type { WorkspaceSource } from "../domain/workspace-source";
import { tryStore } from "./query";

type TaskRow = typeof evalTask.$inferSelect;

interface TaskDefinition {
  /** What a prepare builds that is worth keeping between runs of this case. */
  readonly cache?: { readonly key: string; readonly path: string };
  readonly caseInternalId: string;
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

export interface TaskRepositoryShape {
  readonly list: (
    organizationId: string
  ) => Effect.Effect<readonly TaskRow[], EvalStoreError>;

  readonly upsertByDefinition: (
    input: TaskDefinition & {
      readonly definitionHash: string;
    }
  ) => Effect.Effect<TaskRow, EvalStoreError>;
}

export class TaskRepository extends Context.Tag("@anpord/eval/TaskRepository")<
  TaskRepository,
  TaskRepositoryShape
>() {}

const definitionOf = (input: TaskDefinition) => ({
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

export const TaskRepositoryLive = Layer.effect(
  TaskRepository,
  Effect.gen(function* () {
    const db = yield* Database;
    const ids = yield* IdGenerator;

    return TaskRepository.of({
      upsertByDefinition: (input) =>
        Effect.gen(function* () {
          const internalId = yield* ids.generate("evalTask");

          const rows = yield* tryStore("task.upsertByDefinition", () =>
            db
              .insert(evalTask)
              .values({
                ...definitionOf(input),
                caseInternalId: input.caseInternalId,
                definitionHash: input.definitionHash,
                internalId,
                organizationId: input.organizationId,
              })

              .onConflictDoUpdate({
                set: { name: input.name },
                target: [evalTask.caseInternalId, evalTask.definitionHash],
              })
              .returning()
          );

          const row = rows.at(0);

          return row === undefined
            ? yield* Effect.dieMessage(
                `task ${input.definitionHash} was neither written nor found`
              )
            : row;
        }).pipe(Effect.withSpan("TaskRepository.upsertByDefinition")),

      list: (organizationId) =>
        tryStore("task.list", () =>
          db
            .select()
            .from(evalTask)
            .where(eq(evalTask.organizationId, organizationId))
        ).pipe(Effect.withSpan("TaskRepository.list")),
    });
  })
);
