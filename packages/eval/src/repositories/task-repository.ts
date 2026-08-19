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
    readonly verifyCommand: string;
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
        ).pipe(Effect.map(head)),

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
