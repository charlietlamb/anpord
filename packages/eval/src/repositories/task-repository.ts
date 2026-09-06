import { Database } from "@anpord/db/client";
import { evalTask } from "@anpord/db/schema/evals/eval-tasks";
import { IdGenerator } from "@anpord/ids/id";
import type { EvalPrepare, EvalValidator } from "@anpord/schema/domain/evals";
import { and, eq } from "drizzle-orm";
import { Context, Effect, Layer, type Option } from "effect";
import type { EvalStoreError } from "../domain/errors";
import type { WorkspaceSource } from "../domain/workspace-source";
import { head, tryStore } from "./query";

type TaskRow = typeof evalTask.$inferSelect;

interface TaskDefinition {
  /** What a prepare builds that is worth keeping between runs of this case. */
  readonly cache?: { readonly key: string; readonly path: string };
  readonly name: string;
  readonly organizationId: string;
  readonly prepare: EvalPrepare | null;
  readonly prompt: string;
  readonly source: WorkspaceSource;
  readonly validator: EvalValidator | null;
  readonly verifyCommand: string | null;
  readonly workspace: string;
}

export interface TaskRepositoryShape {
  readonly findById: (
    organizationId: string,
    id: string
  ) => Effect.Effect<Option.Option<TaskRow>, EvalStoreError>;
  readonly insert: (
    input: TaskDefinition & {
      readonly id: string;
    }
  ) => Effect.Effect<TaskRow, EvalStoreError>;
  readonly list: (
    organizationId: string
  ) => Effect.Effect<readonly TaskRow[], EvalStoreError>;

  readonly upsertByIdentity: (
    input: TaskDefinition & {
      readonly identity: string;
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
      findById: (organizationId, id) =>
        tryStore("task.findById", () =>
          db
            .select()
            .from(evalTask)
            .where(
              and(
                eq(evalTask.organizationId, organizationId),
                eq(evalTask.id, id)
              )
            )
        ).pipe(Effect.map(head), Effect.withSpan("TaskRepository.findById")),

      insert: (input) =>
        Effect.gen(function* () {
          const internalId = yield* ids.generate("evalTask");

          const rows = yield* tryStore("task.insert", () =>
            db
              .insert(evalTask)
              .values({
                ...definitionOf(input),
                id: input.id,
                internalId,
                organizationId: input.organizationId,
              })
              .returning()
          );

          return rows[0] as TaskRow;
        }).pipe(Effect.withSpan("TaskRepository.insert")),

      upsertByIdentity: (input) =>
        Effect.gen(function* () {
          const internalId = yield* ids.generate("evalTask");

          const rows = yield* tryStore("task.upsertByIdentity", () =>
            db
              .insert(evalTask)
              .values({
                ...definitionOf(input),
                id: input.identity,
                internalId,
                organizationId: input.organizationId,
              })

              /* Updated, not left alone: an identity names which case this is, not
                 what it contained, so an edited case must not run its old definition. */
              .onConflictDoUpdate({
                set: definitionOf(input),
                target: [evalTask.organizationId, evalTask.id],
              })
              .returning()
          );

          const row = rows.at(0);

          /* An update always returns its row, unlike the do-nothing this
             replaced, so a second read is no longer how the existing one is
             found. */
          return row === undefined
            ? yield* Effect.dieMessage(
                `task ${input.identity} was neither written nor found`
              )
            : row;
        }).pipe(Effect.withSpan("TaskRepository.upsertByIdentity")),

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
