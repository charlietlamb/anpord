import { Database } from "@anpord/db/client";
import { user } from "@anpord/db/schema/auth/users";
import { promptEvent } from "@anpord/db/schema/prompts/prompt-events";
import { promptVersion } from "@anpord/db/schema/prompts/prompt-versions";
import { IdGenerator } from "@anpord/ids/id";
import { desc, eq } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";
import type { PromptStoreError } from "../domain/errors";
import { tryStore } from "./query";

interface RecordEventInput {
  readonly actorId: string | null;
  readonly kind: string;
  readonly promptInternalId: string;
  /** Absent for events about the prompt rather than one of its versions. */
  readonly versionInternalId: string | null;
}

export interface PromptEventRow {
  readonly actor: {
    readonly image: string | null;
    readonly name: string | null;
  } | null;
  readonly createdAt: Date;
  readonly internalId: string;
  readonly kind: string;
  readonly version: number | null;
}

export interface PromptEventRepositoryShape {
  readonly forPrompt: (
    promptInternalId: string
  ) => Effect.Effect<readonly PromptEventRow[], PromptStoreError>;
  readonly record: (
    input: RecordEventInput
  ) => Effect.Effect<void, PromptStoreError>;
}

export class PromptEventRepository extends Context.Tag(
  "@anpord/prompts/PromptEventRepository"
)<PromptEventRepository, PromptEventRepositoryShape>() {}

export const PromptEventRepositoryLive = Layer.effect(
  PromptEventRepository,
  Effect.gen(function* () {
    const db = yield* Database;
    const ids = yield* IdGenerator;

    return {
      forPrompt: (promptInternalId) =>
        tryStore("promptEvent.forPrompt", () =>
          db
            .select({
              actor: { image: user.image, name: user.name },
              createdAt: promptEvent.createdAt,
              internalId: promptEvent.internalId,
              kind: promptEvent.kind,
              version: promptVersion.version,
            })
            .from(promptEvent)
            /* Left-joined: a version may be gone and an actor may have left,
               and neither should take the event with them. */
            .leftJoin(
              promptVersion,
              eq(promptEvent.versionInternalId, promptVersion.internalId)
            )
            .leftJoin(user, eq(promptEvent.actorId, user.id))
            .where(eq(promptEvent.promptInternalId, promptInternalId))
            .orderBy(desc(promptEvent.createdAt))
        ),

      record: (input) =>
        Effect.flatMap(ids.generate("promptEvent"), (internalId) =>
          tryStore("promptEvent.record", async () => {
            await db.insert(promptEvent).values({ ...input, internalId });
          })
        ),
    } satisfies PromptEventRepositoryShape;
  })
);
