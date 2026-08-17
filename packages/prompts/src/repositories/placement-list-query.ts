import type { Database } from "@anpord/db/client";
import { user } from "@anpord/db/schema/auth/users";
import { channel } from "@anpord/db/schema/prompts/channels";
import { promptChannel } from "@anpord/db/schema/prompts/prompt-channels";
import { promptVersion } from "@anpord/db/schema/prompts/prompt-versions";
import { prompt } from "@anpord/db/schema/prompts/prompts";
import type { OrganizationId } from "@anpord/schema/domain/actor";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { PromptCursorPayload } from "../domain/prompt-cursor";

export interface PlacementListParams {
  readonly cursor?: PromptCursorPayload;
  readonly limit: number;
  readonly search?: string;
}

/** The newest version of every prompt, which is what "behind" is measured
 * against. Grouped once rather than correlated per row. */
const latestOf = (db: Database["Type"]) =>
  db
    .select({
      promptInternalId: promptVersion.promptInternalId,
      latestVersion: sql<number>`max(${promptVersion.version})`.as(
        "latest_version"
      ),
    })
    .from(promptVersion)
    .groupBy(promptVersion.promptInternalId)
    .as("latest");

const matchesSearch = (search: string) =>
  sql`(${prompt.id} ilike ${`%${search}%`} or ${prompt.name} ilike ${`%${search}%`})`;

/** Mirrors the `order by` tuple for tuple, so two prompts sharing a timestamp
 * cannot fall through a page boundary. */
const afterCursor = (cursor: PromptCursorPayload) =>
  cursor.sort === "name"
    ? sql`(${prompt.name}, ${prompt.id}) > (${cursor.name}, ${cursor.id})`
    : sql`(${prompt.updatedAt}, ${prompt.id}) < (${new Date(cursor.updatedAt)}, ${cursor.id})`;

/**
 * One row per prompt, ordered and paged.
 *
 * Placements are read separately rather than joined here: a join would repeat
 * every prompt once per channel and make the keyset count rows that are not
 * prompts, which is exactly how a page ends up short.
 */
export const selectPlacementPrompts = (
  db: Database["Type"],
  organizationId: OrganizationId,
  params: PlacementListParams
) => {
  const latest = latestOf(db);

  return db
    .select({
      id: prompt.id,
      internalId: prompt.internalId,
      latestVersion: latest.latestVersion,
      name: prompt.name,
      updatedAt: prompt.updatedAt,
    })
    .from(prompt)
    .leftJoin(latest, eq(latest.promptInternalId, prompt.internalId))
    .where(
      and(
        eq(prompt.organizationId, organizationId),
        isNull(prompt.archivedAt),
        params.search === undefined ? undefined : matchesSearch(params.search),
        params.cursor === undefined ? undefined : afterCursor(params.cursor)
      )
    )
    .orderBy(asc(prompt.name), asc(prompt.id))
    .limit(params.limit + 1);
};

/**
 * Every channel pointed at any of the given prompts.
 *
 * One query for the whole page rather than one per prompt, which is what keeps
 * the grid a single round trip however many rows it shows.
 */
export const selectPlacementsFor = (
  db: Database["Type"],
  promptInternalIds: readonly string[]
) =>
  db
    .select({
      channel: channel.name,
      promptInternalId: promptChannel.promptInternalId,
      updatedAt: promptChannel.updatedAt,
      updatedBy: { image: user.image, name: user.name },
      version: promptVersion.version,
    })
    .from(promptChannel)
    .innerJoin(channel, eq(channel.internalId, promptChannel.channelInternalId))
    .innerJoin(
      promptVersion,
      eq(promptVersion.internalId, promptChannel.versionInternalId)
    )
    .leftJoin(user, eq(user.id, promptChannel.updatedBy))
    .where(inArray(promptChannel.promptInternalId, [...promptInternalIds]))
    .orderBy(asc(channel.name));

/**
 * How many prompts have at least one channel behind their newest version.
 *
 * Counted over the organisation rather than the page, so the summary holds
 * still while the reader pages through the grid.
 */
export const selectPlacementTotals = (
  db: Database["Type"],
  organizationId: OrganizationId
) => {
  const latest = latestOf(db);

  return db
    .select({
      behind: sql<number>`count(distinct case when ${promptVersion.version} < ${latest.latestVersion} then ${prompt.internalId} end)`,
      prompts: sql<number>`count(distinct ${prompt.internalId})`,
    })
    .from(prompt)
    .leftJoin(latest, eq(latest.promptInternalId, prompt.internalId))
    .leftJoin(
      promptChannel,
      eq(promptChannel.promptInternalId, prompt.internalId)
    )
    .leftJoin(
      promptVersion,
      eq(promptVersion.internalId, promptChannel.versionInternalId)
    )
    .where(
      and(eq(prompt.organizationId, organizationId), isNull(prompt.archivedAt))
    );
};
