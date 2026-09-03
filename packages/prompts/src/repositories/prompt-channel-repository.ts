import { Database } from "@anpord/db/client";
import { user } from "@anpord/db/schema/auth/users";
import { channel } from "@anpord/db/schema/prompts/channels";
import { promptChannel } from "@anpord/db/schema/prompts/prompt-channels";
import { promptVersion } from "@anpord/db/schema/prompts/prompt-versions";
import { IdGenerator } from "@anpord/ids/id";
import type { ChannelName } from "@anpord/schema/domain/prompts";
import { and, eq } from "drizzle-orm";
import { Context, Effect, Layer, Option } from "effect";
import type { PromptStoreError } from "../domain/errors";
import { type ChannelMove, movePromptChannel } from "./prompt-channel-move";
import type { VersionRow } from "./prompt-version-repository";
import { head, tryStore } from "./query";

export interface ChannelRow {
  readonly channel: string;
  readonly updatedAt: Date;
  /** Left-joined onto a nullable actor, so a deleted user arrives as a row of
   * nulls rather than as no row. */
  readonly updatedBy: {
    readonly image: string | null;
    readonly name: string | null;
  } | null;
  readonly version: number;
  readonly versionInternalId: string;
}

export interface PromptChannelRepositoryShape {
  readonly list: (
    promptInternalId: string
  ) => Effect.Effect<readonly ChannelRow[], PromptStoreError>;
  readonly move: (input: ChannelMove) => Effect.Effect<void, PromptStoreError>;
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
              channel: channel.name,
              updatedAt: promptChannel.updatedAt,
              updatedBy: { image: user.image, name: user.name },
              version: promptVersion.version,
              versionInternalId: promptVersion.internalId,
            })
            .from(promptChannel)
            .innerJoin(
              channel,
              eq(promptChannel.channelInternalId, channel.internalId)
            )
            .innerJoin(
              promptVersion,
              eq(promptChannel.versionInternalId, promptVersion.internalId)
            )
            .leftJoin(user, eq(user.id, promptChannel.updatedBy))
            .where(eq(promptChannel.promptInternalId, promptInternalId))
            .orderBy(channel.name)
        ),

      resolve: (promptInternalId, name) =>
        tryStore("promptChannel.resolve", () =>
          db
            .select({
              version: promptVersion,
              author: { image: user.image, name: user.name },
            })
            .from(promptChannel)
            .innerJoin(
              channel,
              eq(promptChannel.channelInternalId, channel.internalId)
            )
            .innerJoin(
              promptVersion,
              eq(promptChannel.versionInternalId, promptVersion.internalId)
            )
            .leftJoin(user, eq(user.id, promptVersion.createdBy))
            .where(
              and(
                eq(promptChannel.promptInternalId, promptInternalId),
                eq(channel.name, name)
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
          ids.generate("promptEvent"),
          ids.generate("channel"),
          ids.generate("promptRelease"),
        ]).pipe(
          Effect.flatMap(
            ([
              placementInternalId,
              eventInternalId,
              channelInternalId,
              releaseInternalId,
            ]) =>
              tryStore("promptChannel.move", () =>
                db.transaction((tx) =>
                  movePromptChannel(
                    tx,
                    {
                      channelInternalId,
                      eventInternalId,
                      placementInternalId,
                      releaseInternalId,
                    },
                    input
                  )
                )
              ).pipe(Effect.asVoid)
          )
        ),
    } satisfies PromptChannelRepositoryShape;
  })
);
