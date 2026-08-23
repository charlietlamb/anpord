import { Database } from "@anpord/db/client";
import { evalTask } from "@anpord/db/schema/evals/eval-tasks";
import { IdGenerator } from "@anpord/ids/id";
import { and, eq, isNull } from "drizzle-orm";
import { Context, Effect, Layer, type Option } from "effect";
import type { EvalStoreError } from "../domain/errors";
import type { WorkspaceSource } from "../domain/workspace-source";
import { head, tryStore } from "./query";

type TaskRow = typeof evalTask.$inferSelect;

interface TaskDefinition {
  readonly name: string;
  readonly organizationId: string;
  readonly prompt: string;
  readonly setupCommand: string | null;
  readonly source: WorkspaceSource;
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

  readonly markBracketed: (
    internalId: string,
    bracketedAt: Date
  ) => Effect.Effect<void, EvalStoreError>;

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

const valuesOf = (input: TaskDefinition, id: string, internalId: string) => ({
  id,
  internalId,
  name: input.name,
  organizationId: input.organizationId,
  prompt: input.prompt,
  repoRef: input.source.kind === "repo" ? input.source.ref : null,
  repoUrl: input.source.kind === "repo" ? input.source.url : null,
  setupCommand: input.setupCommand,
  sourceFiles: input.source.kind === "files" ? input.source.files : null,
  sourceKind: input.source.kind,
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
                eq(evalTask.id, id),
                isNull(evalTask.archivedAt)
              )
            )
        ).pipe(Effect.map(head), Effect.withSpan("TaskRepository.findById")),

      insert: (input) =>
        Effect.gen(function* () {
          const internalId = yield* ids.generate("evalTask");

          const rows = yield* tryStore("task.insert", () =>
            db
              .insert(evalTask)
              .values(valuesOf(input, input.id, internalId))
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
              .values(valuesOf(input, input.identity, internalId))

              .onConflictDoNothing({
                target: [evalTask.organizationId, evalTask.id],
              })
              .returning()
          );

          const inserted = rows.at(0);

          if (inserted !== undefined) {
            return inserted;
          }

          const existing = yield* tryStore("task.findByIdentity", () =>
            db
              .select()
              .from(evalTask)
              .where(
                and(
                  eq(evalTask.organizationId, input.organizationId),
                  eq(evalTask.id, input.identity)
                )
              )
          );

          return existing[0] as TaskRow;
        }).pipe(Effect.withSpan("TaskRepository.upsertByIdentity")),

      list: (organizationId) =>
        tryStore("task.list", () =>
          db
            .select()
            .from(evalTask)
            .where(
              and(
                eq(evalTask.organizationId, organizationId),
                isNull(evalTask.archivedAt)
              )
            )
        ).pipe(Effect.withSpan("TaskRepository.list")),

      markBracketed: (internalId, bracketedAt) =>
        tryStore("task.markBracketed", () =>
          db
            .update(evalTask)
            .set({ bracketedAt })
            .where(eq(evalTask.internalId, internalId))
        ).pipe(Effect.asVoid, Effect.withSpan("TaskRepository.markBracketed")),
    });
  })
);
