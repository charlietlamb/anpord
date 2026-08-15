import { Database } from "@anpord/db/client";
import { promptVersion } from "@anpord/db/schema/prompts/prompt-versions";
import { IdGenerator } from "@anpord/ids/id";
import type { PromptId } from "@anpord/schema/prompts";
import { and, desc, eq } from "drizzle-orm";
import { Context, Effect, Layer, type Option } from "effect";
import { type PromptStoreError, VersionConflict } from "../domain/errors";
import { head, query } from "./query";

export type VersionRow = typeof promptVersion.$inferSelect;

const UNIQUE_VIOLATION = "23505";

const isUniqueViolation = (cause: unknown) =>
  typeof cause === "object" &&
  cause !== null &&
  "code" in cause &&
  (cause as { code?: string }).code === UNIQUE_VIOLATION;

export interface PromptVersionRepositoryShape {
  /** `promptId` is carried only to name the prompt in a conflict error. */
  readonly append: (input: {
    readonly actorId: string;
    readonly commitMessage: string | null;
    readonly config: unknown;
    readonly content: string;
    readonly promptId: PromptId;
    readonly promptInternalId: string;
  }) => Effect.Effect<VersionRow, PromptStoreError | VersionConflict>;
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
}

export class PromptVersionRepository extends Context.Tag(
  "@anpord/prompts/PromptVersionRepository"
)<PromptVersionRepository, PromptVersionRepositoryShape>() {}

export const PromptVersionRepositoryLive = Layer.effect(
  PromptVersionRepository,
  Effect.gen(function* () {
    const db = yield* Database;
    const ids = yield* IdGenerator;

    const byNumber = (promptInternalId: string, version: number) =>
      query("promptVersion.byNumber", () =>
        db
          .select()
          .from(promptVersion)
          .where(
            and(
              eq(promptVersion.promptInternalId, promptInternalId),
              eq(promptVersion.version, version)
            )
          )
          .limit(1)
      ).pipe(Effect.map(head));

    const latest = (promptInternalId: string) =>
      query("promptVersion.latest", () =>
        db
          .select()
          .from(promptVersion)
          .where(eq(promptVersion.promptInternalId, promptInternalId))
          .orderBy(desc(promptVersion.version))
          .limit(1)
      ).pipe(Effect.map(head));

    return {
      byNumber,
      latest,

      /**
       * The next number is read then inserted, so concurrent writers can pick
       * the same one. The unique index rejects the loser, surfaced as a
       * retryable conflict rather than a raw store error.
       */
      append: (input) =>
        Effect.flatMap(ids.generate("promptVersion"), (internalId) =>
          query("promptVersion.append", async () => {
            const [previous] = await db
              .select({ version: promptVersion.version })
              .from(promptVersion)
              .where(eq(promptVersion.promptInternalId, input.promptInternalId))
              .orderBy(desc(promptVersion.version))
              .limit(1);

            const [row] = await db
              .insert(promptVersion)
              .values({
                internalId,
                promptInternalId: input.promptInternalId,
                version: (previous?.version ?? 0) + 1,
                content: input.content,
                config: input.config ?? {},
                commitMessage: input.commitMessage,
                createdBy: input.actorId,
              })
              .returning();

            return row;
          }).pipe(
            Effect.catchIf(
              (error) => isUniqueViolation(error.cause),
              () => new VersionConflict({ promptId: input.promptId })
            )
          )
        ),

      list: (promptInternalId) =>
        query("promptVersion.list", () =>
          db
            .select()
            .from(promptVersion)
            .where(eq(promptVersion.promptInternalId, promptInternalId))
            .orderBy(desc(promptVersion.version))
        ),
    } satisfies PromptVersionRepositoryShape;
  })
);
