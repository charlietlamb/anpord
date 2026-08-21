import type { Database } from "@anpord/db/client";
import { user } from "@anpord/db/schema/auth/users";
import { channel } from "@anpord/db/schema/prompts/channels";
import { promptChannel } from "@anpord/db/schema/prompts/prompt-channels";
import { promptVersion } from "@anpord/db/schema/prompts/prompt-versions";
import { prompt } from "@anpord/db/schema/prompts/prompts";
import type { OrganizationId } from "@anpord/schema/domain/actor";
import type {
  PromptSortOrder,
  PromptStatusFilter,
} from "@anpord/schema/domain/prompts";
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  isNotNull,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import type { PromptCursorPayload } from "../domain/prompt-cursor";

export interface PromptListRow {
  /** Whoever last wrote a version that records an author, read through a left
   * join so a deleted account arrives as a row of nulls rather than as no
   * prompt. */
  readonly author: {
    readonly image: string | null;
    readonly name: string | null;
  } | null;
  readonly description: string | null;
  readonly id: string;
  readonly internalId: string;
  readonly latestVersion: number | null;
  readonly name: string;
  readonly productionVersion: number | null;
  readonly updatedAt: Date;
}

export interface PromptListParams {
  readonly cursor?: PromptCursorPayload;
  readonly limit: number;
  readonly search?: string;
  readonly sort?: PromptSortOrder;
  readonly status?: PromptStatusFilter;
}

/** `%` and `_` are wildcards to LIKE, so a user searching for "100%" would
 * otherwise match everything starting with "100". */
const escapeLike = (term: string) =>
  term.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");

const matchesSearch = (term: string) => {
  const pattern = `%${escapeLike(term)}%`;

  return or(
    ilike(prompt.id, pattern),
    ilike(prompt.name, pattern),
    ilike(prompt.description, pattern)
  );
};

/** Each predicate mirrors its own `order by`, tuple for tuple: descending sorts
 * look for rows below the cursor, ascending ones above it. Comparing the whole
 * tuple in one shot is what stops rows sharing a sort key from being skipped. */
export const afterCursor = (cursor: PromptCursorPayload) =>
  cursor.sort === "name"
    ? sql`(${prompt.name}, ${prompt.id}) > (${cursor.name}, ${cursor.id})`
    : sql`(${prompt.updatedAt}, ${prompt.id}) < (${new Date(cursor.updatedAt)}, ${cursor.id})`;

/** Production placement is reached through a left join, so "draft" is the
 * absence of a joined row rather than a column on the prompt itself. */
const matchesStatus = (status: PromptStatusFilter) => {
  if (status === "live") {
    return isNotNull(promptVersion.version);
  }
  return status === "draft" ? isNull(promptVersion.version) : undefined;
};

export const selectPromptList = (
  db: Database["Type"],
  organizationId: OrganizationId,
  params: PromptListParams
) => {
  const latest = db
    .select({
      promptInternalId: promptVersion.promptInternalId,
      latestVersion: sql<number>`max(${promptVersion.version})`.as(
        "latest_version"
      ),
    })
    .from(promptVersion)
    .groupBy(promptVersion.promptInternalId)
    .as("latest");

  /* Who last touched the prompt: the newest version that records an author,
     not simply the newest. A version written through the API carries no user,
     and binding to the highest number would blank the face on a prompt a
     person did edit merely because a machine wrote after them. */
  const edited = db
    .select({
      promptInternalId: promptVersion.promptInternalId,
      editorId:
        sql<string>`(array_agg(${promptVersion.createdBy} order by ${promptVersion.version} desc))[1]`.as(
          "editor_id"
        ),
    })
    .from(promptVersion)
    .where(isNotNull(promptVersion.createdBy))
    .groupBy(promptVersion.promptInternalId)
    .as("edited");

  return db
    .select({
      internalId: prompt.internalId,
      id: prompt.id,
      name: prompt.name,
      description: prompt.description,
      updatedAt: prompt.updatedAt,
      latestVersion: latest.latestVersion,
      productionVersion: promptVersion.version,
      author: { image: user.image, name: user.name },
    })
    .from(prompt)
    .leftJoin(latest, eq(latest.promptInternalId, prompt.internalId))
    .leftJoin(edited, eq(edited.promptInternalId, prompt.internalId))
    .leftJoin(user, eq(user.id, edited.editorId))
    .leftJoin(
      channel,
      /* The channel the organisation answers a bare request from, so the
         column shows what a caller receives rather than a channel by name. */
      and(
        eq(channel.organizationId, organizationId),
        eq(channel.isDefault, true)
      )
    )
    .leftJoin(
      promptChannel,
      and(
        eq(promptChannel.promptInternalId, prompt.internalId),
        eq(promptChannel.channelInternalId, channel.internalId)
      )
    )
    .leftJoin(
      promptVersion,
      eq(promptVersion.internalId, promptChannel.versionInternalId)
    )
    .where(
      and(
        eq(prompt.organizationId, organizationId),
        isNull(prompt.archivedAt),
        params.search === undefined ? undefined : matchesSearch(params.search),
        params.status === undefined ? undefined : matchesStatus(params.status),
        params.cursor === undefined ? undefined : afterCursor(params.cursor)
      )
    )
    .orderBy(
      ...(params.sort === "name"
        ? [asc(prompt.name), asc(prompt.id)]
        : [desc(prompt.updatedAt), desc(prompt.id)])
    )
    .limit(params.limit + 1);
};
