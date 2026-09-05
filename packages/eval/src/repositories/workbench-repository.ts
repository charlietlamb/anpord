import { Database } from "@anpord/db/client";
import { evalPlayground } from "@anpord/db/schema/evals/eval-playgrounds";
import { IdGenerator } from "@anpord/ids/id";
import { and, desc, eq } from "drizzle-orm";
import { Clock, Context, Effect, Layer, Option } from "effect";
import type { EvalStoreError } from "../domain/errors";
import type { PlaygroundConfig } from "../domain/playground-config";
import { emptyPlaygroundConfig } from "../domain/playground-config";
import { tryStore } from "./query";

type Row = typeof evalPlayground.$inferSelect;

export interface WorkbenchRepositoryShape {
  readonly find: (
    organizationId: string,
    id: string
  ) => Effect.Effect<Option.Option<Row>, EvalStoreError>;
  readonly insert: (input: {
    readonly actorId: string | null;
    readonly name: string;
    readonly organizationId: string;
  }) => Effect.Effect<Row, EvalStoreError>;
  readonly list: (
    organizationId: string
  ) => Effect.Effect<readonly Row[], EvalStoreError>;
  readonly markRun: (
    internalId: string,
    runId: string
  ) => Effect.Effect<void, EvalStoreError>;
  readonly update: (input: {
    readonly config: PlaygroundConfig;
    readonly id: string;
    readonly name: string;
    readonly organizationId: string;
  }) => Effect.Effect<Row, EvalStoreError>;
}

export class WorkbenchRepository extends Context.Tag(
  "@anpord/eval/WorkbenchRepository"
)<WorkbenchRepository, WorkbenchRepositoryShape>() {}

/** Where a saved playground lives. */
export const WorkbenchRepositoryLive = Layer.effect(
  WorkbenchRepository,
  Effect.gen(function* () {
    const db = yield* Database;
    const ids = yield* IdGenerator;

    return WorkbenchRepository.of({
      find: (organizationId, id) =>
        tryStore("workbench.find", () =>
          db
            .select()
            .from(evalPlayground)
            .where(
              and(
                eq(evalPlayground.organizationId, organizationId),
                eq(evalPlayground.id, id)
              )
            )
        ).pipe(
          Effect.map((rows) => Option.fromNullable(rows.at(0))),
          Effect.withSpan("WorkbenchRepository.find")
        ),

      insert: (input) =>
        Effect.gen(function* () {
          const internalId = yield* ids.generate("evalPlaygroundInternal");
          const id = yield* ids.generate("evalPlayground");

          const rows = yield* tryStore("workbench.insert", () =>
            db
              .insert(evalPlayground)
              .values({
                config: emptyPlaygroundConfig,
                createdBy: input.actorId,
                id,
                internalId,
                name: input.name,
                organizationId: input.organizationId,
              })
              .returning()
          );

          return rows[0] as Row;
        }).pipe(Effect.withSpan("WorkbenchRepository.insert")),

      list: (organizationId) =>
        tryStore("workbench.list", () =>
          db
            .select()
            .from(evalPlayground)
            .where(eq(evalPlayground.organizationId, organizationId))
            .orderBy(desc(evalPlayground.updatedAt))
        ).pipe(Effect.withSpan("WorkbenchRepository.list")),

      markRun: (internalId, runId) =>
        tryStore("workbench.markRun", () =>
          db
            .update(evalPlayground)
            .set({ lastRunId: runId })
            .where(eq(evalPlayground.internalId, internalId))
        ).pipe(Effect.asVoid, Effect.withSpan("WorkbenchRepository.markRun")),

      update: (input) =>
        Effect.gen(function* () {
          const now = yield* Clock.currentTimeMillis;

          const rows = yield* tryStore("workbench.update", () =>
            db
              .update(evalPlayground)
              .set({
                config: input.config,
                name: input.name,
                updatedAt: new Date(now),
              })
              .where(
                and(
                  eq(evalPlayground.organizationId, input.organizationId),
                  eq(evalPlayground.id, input.id)
                )
              )
              .returning()
          );

          return rows[0] as Row;
        }).pipe(Effect.withSpan("WorkbenchRepository.update")),
    });
  })
);
