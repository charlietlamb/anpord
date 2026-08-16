import { Database } from "@anpord/db/client";
import { user } from "@anpord/db/schema/auth/users";
import { channel } from "@anpord/db/schema/prompts/channels";
import { promptChannelEvent } from "@anpord/db/schema/prompts/prompt-channel-events";
import { promptChannel } from "@anpord/db/schema/prompts/prompt-channels";
import { promptVersion } from "@anpord/db/schema/prompts/prompt-versions";
import { prompt } from "@anpord/db/schema/prompts/prompts";
import { IdGenerator } from "@anpord/ids/id";
import { DEFAULT_CHANNEL_COLOR } from "@anpord/schema/domain/channels";
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
              channel: channel.name,
              updatedAt: promptChannel.updatedAt,
              updatedBy: { image: user.image, name: user.name },
              version: promptVersion.version,
              versionInternalId: promptChannel.versionInternalId,
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
          ids.generate("channelEvent"),
          ids.generate("channel"),
        ]).pipe(
          Effect.flatMap(
            ([placementInternalId, eventInternalId, newChannelId]) =>
              tryStore("promptChannel.move", async () => {
                const [owner] = await db
                  .select({ organizationId: prompt.organizationId })
                  .from(prompt)
                  .where(eq(prompt.internalId, input.promptInternalId))
                  .limit(1);

                if (!owner) {
                  throw new Error(
                    `no prompt with internal id ${input.promptInternalId}`
                  );
                }

                /** Publishing to a channel the organisation has not used before
                 * still creates it, so a move never fails on a missing row. */
                const [created] = await db
                  .insert(channel)
                  .values({
                    internalId: newChannelId,
                    organizationId: owner.organizationId,
                    name: input.channel,
                    color: DEFAULT_CHANNEL_COLOR,
                  })
                  .onConflictDoNothing()
                  .returning({ internalId: channel.internalId });

                const channelInternalId =
                  created?.internalId ??
                  (
                    await db
                      .select({ internalId: channel.internalId })
                      .from(channel)
                      .where(
                        and(
                          eq(channel.organizationId, owner.organizationId),
                          eq(channel.name, input.channel)
                        )
                      )
                      .limit(1)
                  ).at(0)?.internalId;

                if (channelInternalId === undefined) {
                  throw new Error(`no channel named ${input.channel}`);
                }

                const [existing] = await db
                  .select()
                  .from(promptChannel)
                  .where(
                    and(
                      eq(
                        promptChannel.promptInternalId,
                        input.promptInternalId
                      ),
                      eq(promptChannel.channelInternalId, channelInternalId)
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
                    internalId: placementInternalId,
                    promptInternalId: input.promptInternalId,
                    channelInternalId,
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
