import type { Database } from "@anpord/db/client";
import { user } from "@anpord/db/schema/auth/users";
import { promptChannelEvent } from "@anpord/db/schema/prompts/prompt-channel-events";
import { promptVersion } from "@anpord/db/schema/prompts/prompt-versions";
import { prompt } from "@anpord/db/schema/prompts/prompts";
import type { OrganizationId } from "@anpord/schema/domain/actor";
import { aliasedTable, and, desc, eq, sql } from "drizzle-orm";
import type { DeploymentCursorPayload } from "../domain/deployment-cursor";

const fromVersion = aliasedTable(promptVersion, "from_version");
const toVersion = aliasedTable(promptVersion, "to_version");

export interface DeploymentListParams {
  readonly channel?: string;
  readonly cursor?: DeploymentCursorPayload;
  readonly limit: number;
  readonly promptId?: string;
}

/** The predicate mirrors the `order by` tuple for tuple. Comparing the pair in
 * one shot is what stops two deployments sharing a millisecond from being
 * skipped when they straddle a page boundary. */
export const afterCursor = (cursor: DeploymentCursorPayload) =>
  sql`(${promptChannelEvent.createdAt}, ${promptChannelEvent.internalId}) < (${cursor.deployedAt}::timestamp, ${cursor.id})`;

/** Built out here rather than inline in the layer so the joins and the tenant
 * predicate can be asserted without a database. */
export const selectDeploymentList = (
  db: Database["Type"],
  organizationId: OrganizationId,
  params: DeploymentListParams
) => {
  const where = [eq(prompt.organizationId, organizationId)];

  if (params.channel !== undefined) {
    where.push(eq(promptChannelEvent.channel, params.channel));
  }
  if (params.promptId !== undefined) {
    where.push(eq(prompt.id, params.promptId));
  }
  if (params.cursor !== undefined) {
    where.push(afterCursor(params.cursor));
  }

  return db
    .select({
      channel: promptChannelEvent.channel,
      deployedAt: promptChannelEvent.createdAt,
      deployedBy: { image: user.image, name: user.name },
      fromVersion: fromVersion.version,
      internalId: promptChannelEvent.internalId,
      promptId: prompt.id,
      promptName: prompt.name,
      toVersion: toVersion.version,
    })
    .from(promptChannelEvent)
    .innerJoin(
      prompt,
      eq(prompt.internalId, promptChannelEvent.promptInternalId)
    )
    .innerJoin(
      toVersion,
      eq(toVersion.internalId, promptChannelEvent.toVersionInternalId)
    )
    .leftJoin(
      fromVersion,
      eq(fromVersion.internalId, promptChannelEvent.fromVersionInternalId)
    )
    .leftJoin(user, eq(user.id, promptChannelEvent.actorId))
    .where(and(...where))
    .orderBy(
      desc(promptChannelEvent.createdAt),
      desc(promptChannelEvent.internalId)
    )
    .limit(params.limit);
};
