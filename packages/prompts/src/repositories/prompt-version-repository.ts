import { Database } from "@anpord/db/client";
import { user } from "@anpord/db/schema/auth/users";
import { promptVersion } from "@anpord/db/schema/prompts/prompt-versions";
import { IdGenerator } from "@anpord/ids/id";
import type { PromptId } from "@anpord/schema/prompts";
import { and, desc, eq } from "drizzle-orm";
import { Context, Effect, Layer, type Option } from "effect";
import { type PromptStoreError, VersionConflict } from "../domain/errors";
import { isUniqueViolation } from "./postgres-errors";
import { head, tryStore } from "./query";

export type VersionRow = typeof promptVersion.$inferSelect & {
  readonly author: {
    readonly image: string | null;
    readonly name: string;
  } | null;
};

interface AppendVersionInput {
  readonly actorId: string;
  readonly commitMessage: string | null;
  readonly config: unknown;
  readonly content: string;
  readonly promptId: PromptId;
  readonly promptInternalId: string;
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
        Effect.flatMap(ids.generate("promptVersion"), (internalId) =>
          tryStore("promptVersion.append", async () => {
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

            const [author] = await db
              .select({ image: user.image, name: user.name })
              .from(user)
              .where(eq(user.id, input.actorId))
              .limit(1);

            return { ...row, author: author ?? null };
          }).pipe(
            Effect.catchIf(
              (error) => isUniqueViolation(error.cause),
              () => new VersionConflict({ promptId: input.promptId })
            )
          )
        ),

      list: (promptInternalId) =>
        tryStore("promptVersion.list", () =>
          selectVersion()
            .where(eq(promptVersion.promptInternalId, promptInternalId))
            .orderBy(desc(promptVersion.version))
        ),
    } satisfies PromptVersionRepositoryShape;
  })
);
