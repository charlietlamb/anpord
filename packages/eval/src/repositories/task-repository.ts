import { Database } from "@anpord/db/client";
import { evalTask } from "@anpord/db/schema/evals/eval-tasks";
import { IdGenerator } from "@anpord/ids/id";
import { and, eq, isNull } from "drizzle-orm";
import { Context, Effect, Layer, type Option } from "effect";
import type { EvalStoreError } from "../domain/errors";
import { head, tryStore } from "./query";

type TaskRow = typeof evalTask.$inferSelect;

export interface TaskRepositoryShape {
  readonly findById: (
    organizationId: string,
    id: string
  ) => Effect.Effect<Option.Option<TaskRow>, EvalStoreError>;
  readonly insert: (input: {
    readonly id: string;
    readonly name: string;
    readonly organizationId: string;
    readonly prompt: string;
    readonly setupCommand: string | null;
    readonly verifyCommand: string | null;
    readonly workspace: string;
  }) => Effect.Effect<TaskRow, EvalStoreError>;
  readonly list: (
    organizationId: string
  ) => Effect.Effect<readonly TaskRow[], EvalStoreError>;
  /** A task is registered only once the bracket has run: once with a correct
   * solution, once with nothing. Until then it is written but not trusted. */
  readonly markBracketed: (
    internalId: string,
    bracketedAt: Date
  ) => Effect.Effect<void, EvalStoreError>;
  /** Finds the task for a case definition, or writes it. */
  readonly upsertByIdentity: (input: {
    readonly identity: string;
    readonly name: string;
    readonly organizationId: string;
    readonly prompt: string;
    readonly setupCommand: string | null;
    readonly verifyCommand: string | null;
    readonly workspace: string;
  }) => Effect.Effect<TaskRow, EvalStoreError>;
}

export class TaskRepository extends Context.Tag("@anpord/eval/TaskRepository")<
  TaskRepository,
  TaskRepositoryShape
>() {}

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
              .values({
                id: input.id,
                internalId,
                name: input.name,
                organizationId: input.organizationId,
                prompt: input.prompt,
                setupCommand: input.setupCommand,
                verifyCommand: input.verifyCommand,
                workspace: input.workspace,
              })
              .returning()
          );

          return rows[0] as TaskRow;
        }),

      /* The identity is the public id, so the existing unique index on
         (organizationId, id) does the deduplication and two runs racing the
         same new case cannot create two rows. */
      upsertByIdentity: (input) =>
        Effect.gen(function* () {
          const internalId = yield* ids.generate("evalTask");

          const rows = yield* tryStore("task.upsertByIdentity", () =>
            db
              .insert(evalTask)
              .values({
                id: input.identity,
                internalId,
                name: input.name,
                organizationId: input.organizationId,
                prompt: input.prompt,
                setupCommand: input.setupCommand,
                verifyCommand: input.verifyCommand,
                workspace: input.workspace,
              })
              /** Nothing is updated, because the identity is the content: a
               * row that already exists is already correct. */
              .onConflictDoNothing({
                target: [evalTask.organizationId, evalTask.id],
              })
              .returning()
          );

          const inserted = rows.at(0);

          if (inserted !== undefined) {
            return inserted;
          }

          /* The row already existed, so the insert returned nothing. Reading
             it back is the price of never mutating it. */
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
        }),

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
        ),

      markBracketed: (internalId, bracketedAt) =>
        tryStore("task.markBracketed", () =>
          db
            .update(evalTask)
            .set({ bracketedAt })
            .where(eq(evalTask.internalId, internalId))
        ).pipe(Effect.asVoid),
    });
  })
);
