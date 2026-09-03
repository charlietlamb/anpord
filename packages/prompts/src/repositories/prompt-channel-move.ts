import { promptChannel } from "@anpord/db/schema/prompts/prompt-channels";
import { promptEvent } from "@anpord/db/schema/prompts/prompt-events";
import { promptReleaseVersion } from "@anpord/db/schema/prompts/prompt-release-versions";
import { promptRelease } from "@anpord/db/schema/prompts/prompt-releases";
import { promptVersion } from "@anpord/db/schema/prompts/prompt-versions";
import { prompt } from "@anpord/db/schema/prompts/prompts";
import { DEFAULT_CHANNEL_COLOR } from "@anpord/schema/domain/channels";
import type { ChannelName, VersionNumber } from "@anpord/schema/domain/prompts";
import { pinned } from "@anpord/schema/domain/releases";
import { and, eq } from "drizzle-orm";
import { claimChannel } from "./claim-channel";
import type { Tx } from "./query";

export interface ChannelMove {
  readonly authorId: string | null;
  readonly channel: ChannelName;
  readonly movedAt: Date;
  readonly promptInternalId: string;
  readonly versionInternalId: string;
}

export interface ChannelMoveIds {
  readonly channelInternalId: string;
  readonly eventInternalId: string;
  readonly placementInternalId: string;
  readonly releaseInternalId: string;
}

/** One transaction: a placement moved without its release or its audit event is a discrepancy nothing downstream can detect. */
export const movePromptChannel = async (
  tx: Tx,
  ids: ChannelMoveIds,
  input: ChannelMove
) => {
  const [owner] = await tx
    .select({ organizationId: prompt.organizationId })
    .from(prompt)
    .where(eq(prompt.internalId, input.promptInternalId))
    .limit(1);

  if (!owner) {
    throw new Error(`no prompt with internal id ${input.promptInternalId}`);
  }

  const channelInternalId = await claimChannel(tx, {
    color: DEFAULT_CHANNEL_COLOR,
    internalId: ids.channelInternalId,
    name: input.channel,
    organizationId: owner.organizationId,
  });

  const [existing] = await tx
    .select()
    .from(promptChannel)
    .where(
      and(
        eq(promptChannel.promptInternalId, input.promptInternalId),
        eq(promptChannel.channelInternalId, channelInternalId)
      )
    )
    .limit(1);

  const [version] = await tx
    .select({ version: promptVersion.version })
    .from(promptVersion)
    .where(eq(promptVersion.internalId, input.versionInternalId))
    .limit(1);

  if (!version) {
    throw new Error(`no version with internal id ${input.versionInternalId}`);
  }

  await tx.insert(promptRelease).values({
    internalId: ids.releaseInternalId,
    promptInternalId: input.promptInternalId,
    kind: "pinned",
    definition: pinned(version.version as VersionNumber),
    createdBy: input.authorId,
    createdAt: input.movedAt,
  });

  await tx.insert(promptReleaseVersion).values({
    releaseInternalId: ids.releaseInternalId,
    versionInternalId: input.versionInternalId,
  });

  if (existing) {
    await tx
      .update(promptChannel)
      .set({
        releaseInternalId: ids.releaseInternalId,
        versionInternalId: input.versionInternalId,
        updatedBy: input.authorId,
        updatedAt: input.movedAt,
      })
      .where(eq(promptChannel.internalId, existing.internalId));
  } else {
    await tx.insert(promptChannel).values({
      internalId: ids.placementInternalId,
      promptInternalId: input.promptInternalId,
      channelInternalId,
      releaseInternalId: ids.releaseInternalId,
      versionInternalId: input.versionInternalId,
      updatedBy: input.authorId,
      updatedAt: input.movedAt,
    });
  }

  await tx.insert(promptEvent).values({
    actorId: input.authorId,
    channel: input.channel,
    createdAt: input.movedAt,
    fromVersionInternalId: existing?.versionInternalId ?? null,
    internalId: ids.eventInternalId,
    kind: "deployed",
    promptInternalId: input.promptInternalId,
    versionInternalId: input.versionInternalId,
  });
};
