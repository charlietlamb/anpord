import { Database } from "@anpord/db/client";
import { user } from "@anpord/db/schema/auth/users";
import { promptChannelEvent } from "@anpord/db/schema/prompts/prompt-channel-events";
import { promptChannel } from "@anpord/db/schema/prompts/prompt-channels";
import { promptVersion } from "@anpord/db/schema/prompts/prompt-versions";
import { IdGenerator } from "@anpord/ids/id";
import type { ChannelName } from "@anpord/schema/domain/prompts";
import { and, eq } from "drizzle-orm";
import { Context, Effect, Layer, Option } from "effect";
import type { PromptStoreError } from "../domain/errors";
import type { VersionRow } from "./prompt-version-repository";
import { head, tryStore } from "./query";

export interface ChannelRow {
  readonly channel: string;
  readonly updatedAt: Date;
  readonly updatedBy: {
    readonly image: string | null;
    readonly name: string;
  } | null;
  readonly version: number;
  readonly versionInternalId: string;
}

export interface PromptChannelRepositoryShape {
  readonly list: (
    promptInternalId: string
  ) => Effect.Effect<readonly ChannelRow[], PromptStoreError>;
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
      list: (promptInternalId) =>
        tryStore("promptChannel.list", () =>
          db
            .select({
              channel: promptChannel.name,
              updatedAt: promptChannel.updatedAt,
              updatedBy: { image: user.image, name: user.name },
              version: promptVersion.version,
              versionInternalId: promptChannel.versionInternalId,
            })
            .from(promptChannel)
            .innerJoin(
              promptVersion,
              eq(promptChannel.versionInternalId, promptVersion.internalId)
            )
            .leftJoin(user, eq(user.id, promptChannel.updatedBy))
            .where(eq(promptChannel.promptInternalId, promptInternalId))
            .orderBy(promptChannel.name)
        ),

      resolve: (promptInternalId, channel) =>
        tryStore("promptChannel.resolve", () =>
          db
            .select({
              version: promptVersion,
              author: { image: user.image, name: user.name },
            })
            .from(promptChannel)
            .innerJoin(
              promptVersion,
              eq(promptChannel.versionInternalId, promptVersion.internalId)
            )
            .leftJoin(user, eq(user.id, promptVersion.createdBy))
            .where(
              and(
                eq(promptChannel.promptInternalId, promptInternalId),
                eq(promptChannel.name, channel)
              )
            )
            .limit(1)
        ).pipe(
          Effect.map((rows) =>
            head(rows).pipe(
              Option.map((row) => ({ ...row.version, author: row.author }))
            )
          )
        ),

      move: (input) =>
        Effect.all([
          ids.generate("promptChannel"),
          ids.generate("channelEvent"),
        ]).pipe(
          Effect.flatMap(([channelInternalId, eventInternalId]) =>
            tryStore("promptChannel.move", async () => {
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
