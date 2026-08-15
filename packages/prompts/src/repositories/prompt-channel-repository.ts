import { Database } from "@anpord/db/client";
import {
  promptChannel,
  promptChannelEvent,
  promptVersion,
} from "@anpord/db/schema";
import { IdGenerator } from "@anpord/ids/id";
import type { ChannelName } from "@anpord/schema/prompts";
import { and, eq } from "drizzle-orm";
import { Context, Effect, Layer, Option } from "effect";
import type { PromptStoreError } from "../domain/errors";
import type { VersionRow } from "./prompt-version-repository";
import { head, query } from "./query";

export interface PromptChannelRepositoryShape {
  readonly move: (input: {
    readonly actorId: string;
    readonly channel: ChannelName;
    readonly movedAt: Date;
    readonly promptInternalId: string;
    readonly versionInternalId: string;
  }) => Effect.Effect<void, PromptStoreError>;
  readonly resolve: (
    promptInternalId: string,
    channel: ChannelName
  ) => Effect.Effect<Option.Option<VersionRow>, PromptStoreError>;
}

export class PromptChannelRepository extends Context.Tag(
  "@anpord/prompts/PromptChannelRepository"
)<PromptChannelRepository, PromptChannelRepositoryShape>() {}

export const PromptChannelRepositoryLive = Layer.effect(
  PromptChannelRepository,
  Effect.gen(function* () {
    const db = yield* Database;
    const ids = yield* IdGenerator;

    return {
      resolve: (promptInternalId, channel) =>
        query("promptChannel.resolve", () =>
          db
            .select({ version: promptVersion })
            .from(promptChannel)
            .innerJoin(
              promptVersion,
              eq(promptChannel.versionInternalId, promptVersion.internalId)
            )
            .where(
              and(
                eq(promptChannel.promptInternalId, promptInternalId),
                eq(promptChannel.name, channel)
              )
            )
            .limit(1)
        ).pipe(
          Effect.map((rows) =>
            head(rows).pipe(Option.map((row) => row.version))
          )
        ),

      /**
       * The pointer move and its audit row are one operation: a deploy that
       * left no event would make the history lie about what shipped.
       */
      move: (input) =>
        Effect.all([
          ids.generate("promptChannel"),
          ids.generate("channelEvent"),
        ]).pipe(
          Effect.flatMap(([channelInternalId, eventInternalId]) =>
            query("promptChannel.move", async () => {
              const [existing] = await db
                .select()
                .from(promptChannel)
                .where(
                  and(
                    eq(promptChannel.promptInternalId, input.promptInternalId),
                    eq(promptChannel.name, input.channel)
                  )
                )
                .limit(1);

              if (existing) {
                await db
                  .update(promptChannel)
                  .set({
                    versionInternalId: input.versionInternalId,
                    updatedBy: input.actorId,
                    updatedAt: input.movedAt,
                  })
                  .where(eq(promptChannel.internalId, existing.internalId));
              } else {
                await db.insert(promptChannel).values({
                  internalId: channelInternalId,
                  promptInternalId: input.promptInternalId,
                  name: input.channel,
                  versionInternalId: input.versionInternalId,
                  updatedBy: input.actorId,
                  updatedAt: input.movedAt,
                });
              }

              await db.insert(promptChannelEvent).values({
                internalId: eventInternalId,
                promptInternalId: input.promptInternalId,
                channel: input.channel,
                fromVersionInternalId: existing?.versionInternalId ?? null,
                toVersionInternalId: input.versionInternalId,
                actorId: input.actorId,
                createdAt: input.movedAt,
              });
            }).pipe(Effect.asVoid)
          )
        ),
    } satisfies PromptChannelRepositoryShape;
  })
);
