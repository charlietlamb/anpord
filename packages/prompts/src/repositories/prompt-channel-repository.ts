import { Database } from "@anpord/db/client";
import { user } from "@anpord/db/schema/auth/users";
import { channel } from "@anpord/db/schema/prompts/channels";
import { promptChannelEvent } from "@anpord/db/schema/prompts/prompt-channel-events";
import { promptChannel } from "@anpord/db/schema/prompts/prompt-channels";
import { promptReleaseVersion } from "@anpord/db/schema/prompts/prompt-release-versions";
import { promptRelease } from "@anpord/db/schema/prompts/prompt-releases";
import { promptVersion } from "@anpord/db/schema/prompts/prompt-versions";
import { prompt } from "@anpord/db/schema/prompts/prompts";
import { IdGenerator } from "@anpord/ids/id";
import { DEFAULT_CHANNEL_COLOR } from "@anpord/schema/domain/channels";
import type { ChannelName, VersionNumber } from "@anpord/schema/domain/prompts";
import { pinned } from "@anpord/schema/domain/releases";
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

type Tx = Parameters<Parameters<Database["Type"]["transaction"]>[0]>[0];

/** Publishing to a channel the organisation has not used before creates it, so
 * a move never fails on a missing row. Conflict means another writer got there
 * first, and its row is the one to use. */
const claimChannel = async (
  tx: Tx,
  values: {
    readonly color: string;
    readonly internalId: string;
    readonly name: string;
    readonly organizationId: string;
  }
) => {
  const [created] = await tx
    .insert(channel)
    .values(values)
    .onConflictDoNothing()
    .returning({ internalId: channel.internalId });

  if (created) {
    return created.internalId;
  }

  const [found] = await tx
    .select({ internalId: channel.internalId })
    .from(channel)
    .where(
      and(
        eq(channel.organizationId, values.organizationId),
        eq(channel.name, values.name)
      )
    )
    .limit(1);

  if (!found) {
    throw new Error(`no channel named ${values.name}`);
  }

  return found.internalId;
};

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
          ids.generate("channelEvent"),
          ids.generate("channel"),
          ids.generate("promptRelease"),
        ]).pipe(
          Effect.flatMap(
            ([
              placementInternalId,
              eventInternalId,
              newChannelId,
              releaseInternalId,
            ]) =>
              /** One transaction, because a placement that moved without its
               * release or without its audit event is a discrepancy nothing
               * downstream can detect afterwards. */
              tryStore("promptChannel.move", () =>
                db.transaction(async (tx) => {
                  const [owner] = await tx
                    .select({ organizationId: prompt.organizationId })
                    .from(prompt)
                    .where(eq(prompt.internalId, input.promptInternalId))
                    .limit(1);

                  if (!owner) {
                    throw new Error(
                      `no prompt with internal id ${input.promptInternalId}`
                    );
                  }

                  const channelInternalId = await claimChannel(tx, {
                    color: DEFAULT_CHANNEL_COLOR,
                    internalId: newChannelId,
                    name: input.channel,
                    organizationId: owner.organizationId,
                  });

                  const [existing] = await tx
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

                  const [version] = await tx
                    .select({ version: promptVersion.version })
                    .from(promptVersion)
                    .where(
                      eq(promptVersion.internalId, input.versionInternalId)
                    )
                    .limit(1);

                  if (!version) {
                    throw new Error(
                      `no version with internal id ${input.versionInternalId}`
                    );
                  }

                  await tx.insert(promptRelease).values({
                    internalId: releaseInternalId,
                    promptInternalId: input.promptInternalId,
                    kind: "pinned",
                    definition: pinned(version.version as VersionNumber),
                    createdBy: input.actorId,
                    createdAt: input.movedAt,
                  });

                  await tx.insert(promptReleaseVersion).values({
                    releaseInternalId,
                    versionInternalId: input.versionInternalId,
                  });

                  if (existing) {
                    await tx
                      .update(promptChannel)
                      .set({
                        releaseInternalId,
                        versionInternalId: input.versionInternalId,
                        updatedBy: input.actorId,
                        updatedAt: input.movedAt,
                      })
                      .where(eq(promptChannel.internalId, existing.internalId));
                  } else {
                    await tx.insert(promptChannel).values({
                      internalId: placementInternalId,
                      promptInternalId: input.promptInternalId,
                      channelInternalId,
                      releaseInternalId,
                      versionInternalId: input.versionInternalId,
                      updatedBy: input.actorId,
                      updatedAt: input.movedAt,
                    });
                  }

                  await tx.insert(promptChannelEvent).values({
                    internalId: eventInternalId,
                    promptInternalId: input.promptInternalId,
                    channel: input.channel,
                    fromVersionInternalId: existing?.versionInternalId ?? null,
                    toVersionInternalId: input.versionInternalId,
                    actorId: input.actorId,
                    createdAt: input.movedAt,
                  });
                })
              ).pipe(Effect.asVoid)
          )
        ),
    } satisfies PromptChannelRepositoryShape;
  })
);
