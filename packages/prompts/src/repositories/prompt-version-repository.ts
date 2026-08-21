import { Database } from "@anpord/db/client";
import { user } from "@anpord/db/schema/auth/users";
import { promptEvent } from "@anpord/db/schema/prompts/prompt-events";
import { promptVersion } from "@anpord/db/schema/prompts/prompt-versions";
import { IdGenerator } from "@anpord/ids/id";
import type { PromptId } from "@anpord/schema/domain/prompts";
import { and, desc, eq } from "drizzle-orm";
import { Context, Effect, Layer, Option, Schedule } from "effect";
import { type PromptStoreError, VersionConflict } from "../domain/errors";
import { isUniqueViolation } from "./postgres-errors";
import { head, tryStore } from "./query";

/** Three attempts covers the contention a small team produces; beyond that the
 * collision is not transient and the caller should hear about it. */
const APPEND_RETRY = Schedule.exponential("20 millis").pipe(
  Schedule.jittered,
  Schedule.compose(Schedule.recurs(3))
);

/** The author comes from a left join onto a nullable actor, so a deleted user
 * arrives as a row of nulls rather than as no row. The name is nullable here
 * because the database says so; `authorOf` is what turns that into no author. */
export type VersionRow = typeof promptVersion.$inferSelect & {
  readonly author: {
    readonly image: string | null;
    readonly name: string | null;
  } | null;
};

interface AppendVersionInput {
  readonly authorId: string | null;
  readonly commitMessage: string | null;
  readonly config: unknown;
  readonly content: string;
  readonly promptId: PromptId;
  readonly promptInternalId: string;
}

interface UpdateVersionInput {
  readonly actorId: string | null;
  readonly commitMessage: string | undefined;
  readonly config: unknown;
  readonly content: string;
  readonly promptInternalId: string;
  readonly version: number;
}

export interface PromptVersionRepositoryShape {
  readonly append: (
    input: AppendVersionInput
  ) => Effect.Effect<VersionRow, PromptStoreError | VersionConflict>;
  readonly byNumber: (
    promptInternalId: string,
    version: number
  ) => Effect.Effect<Option.Option<VersionRow>, PromptStoreError>;
  readonly latest: (
    promptInternalId: string
  ) => Effect.Effect<Option.Option<VersionRow>, PromptStoreError>;
  readonly list: (
    promptInternalId: string
  ) => Effect.Effect<readonly VersionRow[], PromptStoreError>;
  readonly update: (
    input: UpdateVersionInput
  ) => Effect.Effect<Option.Option<VersionRow>, PromptStoreError>;
}

export class PromptVersionRepository extends Context.Tag(
  "@anpord/prompts/PromptVersionRepository"
)<PromptVersionRepository, PromptVersionRepositoryShape>() {}

export const PromptVersionRepositoryLive = Layer.effect(
  PromptVersionRepository,
  Effect.gen(function* () {
    const db = yield* Database;
    const ids = yield* IdGenerator;

    const selectVersion = () =>
      db
        .select({
          internalId: promptVersion.internalId,
          promptInternalId: promptVersion.promptInternalId,
          version: promptVersion.version,
          content: promptVersion.content,
          config: promptVersion.config,
          commitMessage: promptVersion.commitMessage,
          createdBy: promptVersion.createdBy,
          createdAt: promptVersion.createdAt,
          author: { image: user.image, name: user.name },
        })
        .from(promptVersion)
        .leftJoin(user, eq(user.id, promptVersion.createdBy));

    const byNumber = (promptInternalId: string, version: number) =>
      tryStore("promptVersion.byNumber", () =>
        selectVersion()
          .where(
            and(
              eq(promptVersion.promptInternalId, promptInternalId),
              eq(promptVersion.version, version)
            )
          )
          .limit(1)
      ).pipe(Effect.map(head));

    const latest = (promptInternalId: string) =>
      tryStore("promptVersion.latest", () =>
        selectVersion()
          .where(eq(promptVersion.promptInternalId, promptInternalId))
          .orderBy(desc(promptVersion.version))
          .limit(1)
      ).pipe(Effect.map(head));

    return {
      byNumber,
      latest,

      append: (input) =>
        Effect.flatMap(
          Effect.all([
            ids.generate("promptVersion"),
            ids.generate("promptEvent"),
          ]),
          ([internalId, eventId]) =>
            tryStore("promptVersion.append", () =>
              /* The version and the record of it being written go in together:
               a version nobody can see the writing of is the gap this log
               exists to close. */
              db.transaction(async (tx) => {
                const [previous] = await tx
                  .select({ version: promptVersion.version })
                  .from(promptVersion)
                  .where(
                    eq(promptVersion.promptInternalId, input.promptInternalId)
                  )
                  .orderBy(desc(promptVersion.version))
                  .limit(1);

                const [row] = await tx
                  .insert(promptVersion)
                  .values({
                    internalId,
                    promptInternalId: input.promptInternalId,
                    version: (previous?.version ?? 0) + 1,
                    content: input.content,
                    config: input.config ?? {},
                    commitMessage: input.commitMessage,
                    createdBy: input.authorId,
                  })
                  .returning();

                await tx.insert(promptEvent).values({
                  actorId: input.authorId,
                  internalId: eventId,
                  kind: "saved",
                  promptInternalId: input.promptInternalId,
                  versionInternalId: internalId,
                });

                const [author] = input.authorId
                  ? await tx
                      .select({ image: user.image, name: user.name })
                      .from(user)
                      .where(eq(user.id, input.authorId))
                      .limit(1)
                  : [];

                return { ...row, author: author ?? null };
              })
            ).pipe(
              Effect.catchIf(
                (error) => isUniqueViolation(error.cause),
                () => new VersionConflict({ promptId: input.promptId })
              ),
              Effect.retry({
                schedule: APPEND_RETRY,
                while: (error) => error._tag === "VersionConflict",
              })
            )
        ),

      list: (promptInternalId) =>
        tryStore("promptVersion.list", () =>
          selectVersion()
            .where(eq(promptVersion.promptInternalId, promptInternalId))
            .orderBy(desc(promptVersion.version))
        ),

      update: (input) =>
        Effect.flatMap(ids.generate("promptEvent"), (eventId) =>
          tryStore("promptVersion.update", () =>
            /* Overwriting destroys what the version held, and the row it
               rewrites keeps no sign of having been rewritten. The record goes
               in with the write, so neither can exist without the other. */
            db.transaction(async (tx) => {
              const rows = await tx
                .update(promptVersion)
                .set({
                  content: input.content,
                  ...(input.commitMessage === undefined
                    ? {}
                    : { commitMessage: input.commitMessage }),
                  ...(input.config === undefined
                    ? {}
                    : { config: input.config }),
                })
                .where(
                  and(
                    eq(promptVersion.promptInternalId, input.promptInternalId),
                    eq(promptVersion.version, input.version)
                  )
                )
                .returning({ internalId: promptVersion.internalId });

              const updated = rows.at(0);
              if (updated !== undefined) {
                await tx.insert(promptEvent).values({
                  actorId: input.actorId,
                  internalId: eventId,
                  kind: "overwrote",
                  promptInternalId: input.promptInternalId,
                  versionInternalId: updated.internalId,
                });
              }

              return rows;
            })
          )
        ).pipe(
          Effect.flatMap((rows) =>
            Option.isNone(head(rows))
              ? Effect.succeedNone
              : byNumber(input.promptInternalId, input.version)
          )
        ),
    } satisfies PromptVersionRepositoryShape;
  })
);
