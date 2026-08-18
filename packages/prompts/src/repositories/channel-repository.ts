import { Database } from "@anpord/db/client";
import { channel } from "@anpord/db/schema/prompts/channels";
import { promptChannel } from "@anpord/db/schema/prompts/prompt-channels";
import type { OrganizationId } from "@anpord/schema/domain/actor";
import type { ChannelColor } from "@anpord/schema/domain/channels";
import type { ChannelName } from "@anpord/schema/domain/prompts";
import { and, asc, count, eq } from "drizzle-orm";
import { Context, Effect, Layer, type Option } from "effect";
import type { PromptStoreError } from "../domain/errors";
import { head, tryStore } from "./query";

export interface ChannelCountRow {
  readonly color: string;
  readonly createdAt: Date;
  readonly name: string;
  readonly promptCount: number;
}

type ChannelRecord = typeof channel.$inferSelect;

export interface ChannelRepositoryShape {
  readonly byName: (
    organizationId: OrganizationId,
    name: ChannelName
  ) => Effect.Effect<Option.Option<ChannelRecord>, PromptStoreError>;
  /** The channel answering a request that named none, if the organisation
   * holds one. */
  readonly defaultChannel: (
    organizationId: OrganizationId
  ) => Effect.Effect<Option.Option<ChannelRecord>, PromptStoreError>;
  readonly insert: (input: {
    readonly color: ChannelColor;
    readonly createdAt: Date;
    readonly internalId: string;
    readonly name: ChannelName;
    readonly organizationId: OrganizationId;
  }) => Effect.Effect<void, PromptStoreError>;
  readonly list: (
    organizationId: OrganizationId
  ) => Effect.Effect<readonly ChannelCountRow[], PromptStoreError>;
  readonly remove: (
    internalId: string
  ) => Effect.Effect<void, PromptStoreError>;
  /** Clears the organisation's current default before setting this one, so the
   * partial unique index never sees two. */
  readonly setDefault: (
    organizationId: OrganizationId,
    internalId: string
  ) => Effect.Effect<void, PromptStoreError>;
  readonly update: (
    internalId: string,
    changes: {
      readonly color?: ChannelColor;
      readonly name?: ChannelName;
    }
  ) => Effect.Effect<void, PromptStoreError>;
}

export class ChannelRepository extends Context.Tag(
  "@anpord/prompts/ChannelRepository"
)<ChannelRepository, ChannelRepositoryShape>() {}

export const ChannelRepositoryLive = Layer.effect(
  ChannelRepository,
  Effect.gen(function* () {
    const db = yield* Database;

    return {
      list: (organizationId) =>
        tryStore("channel.list", () =>
          db
            .select({
              color: channel.color,
              createdAt: channel.createdAt,
              name: channel.name,
              promptCount: count(promptChannel.internalId),
            })
            .from(channel)
            .leftJoin(
              promptChannel,
              eq(promptChannel.channelInternalId, channel.internalId)
            )
            .where(eq(channel.organizationId, organizationId))
            .groupBy(channel.internalId)
            .orderBy(asc(channel.name))
        ),

      byName: (organizationId, name) =>
        tryStore("channel.byName", () =>
          db
            .select()
            .from(channel)
            .where(
              and(
                eq(channel.organizationId, organizationId),
                eq(channel.name, name)
              )
            )
            .limit(1)
        ).pipe(Effect.map(head)),

      defaultChannel: (organizationId) =>
        tryStore("channel.defaultChannel", () =>
          db
            .select()
            .from(channel)
            .where(
              and(
                eq(channel.organizationId, organizationId),
                eq(channel.isDefault, true)
              )
            )
            .limit(1)
        ).pipe(Effect.map(head)),

      insert: (input) =>
        tryStore("channel.insert", () =>
          db.insert(channel).values({
            internalId: input.internalId,
            organizationId: input.organizationId,
            name: input.name,
            color: input.color,
            createdAt: input.createdAt,
          })
        ).pipe(Effect.asVoid),

      update: (internalId, changes) =>
        tryStore("channel.update", () =>
          db
            .update(channel)
            .set(changes)
            .where(eq(channel.internalId, internalId))
        ).pipe(Effect.asVoid),

      remove: (internalId) =>
        tryStore("channel.remove", () =>
          db.delete(channel).where(eq(channel.internalId, internalId))
        ).pipe(Effect.asVoid),

      setDefault: (organizationId, internalId) =>
        tryStore("channel.setDefault", () =>
          db.transaction(async (tx) => {
            await tx
              .update(channel)
              .set({ isDefault: false })
              .where(
                and(
                  eq(channel.organizationId, organizationId),
                  eq(channel.isDefault, true)
                )
              );

            await tx
              .update(channel)
              .set({ isDefault: true })
              .where(eq(channel.internalId, internalId));
          })
        ).pipe(Effect.asVoid),
    } satisfies ChannelRepositoryShape;
  })
);
