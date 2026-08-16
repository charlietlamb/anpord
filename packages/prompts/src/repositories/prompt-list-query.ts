import type { Database } from "@anpord/db/client";
import { promptChannel } from "@anpord/db/schema/prompts/prompt-channels";
import { promptVersion } from "@anpord/db/schema/prompts/prompt-versions";
import { prompt } from "@anpord/db/schema/prompts/prompts";
import type { OrganizationId } from "@anpord/schema/domain/actor";
import { PRODUCTION } from "@anpord/schema/domain/prompts";
import { and, desc, eq, isNull, sql } from "drizzle-orm";

export interface PromptListRow {
  readonly description: string | null;
  readonly id: string;
  readonly internalId: string;
  readonly latestVersion: number | null;
  readonly name: string;
  readonly productionVersion: number | null;
  readonly updatedAt: Date;
}

export const selectPromptList = (
  db: Database["Type"],
  organizationId: OrganizationId
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

  return db
    .select({
      internalId: prompt.internalId,
      id: prompt.id,
      name: prompt.name,
      description: prompt.description,
      updatedAt: prompt.updatedAt,
      latestVersion: latest.latestVersion,
      productionVersion: promptVersion.version,
    })
    .from(prompt)
    .leftJoin(latest, eq(latest.promptInternalId, prompt.internalId))
    .leftJoin(
      promptChannel,
      and(
        eq(promptChannel.promptInternalId, prompt.internalId),
        eq(promptChannel.name, PRODUCTION)
      )
    )
    .leftJoin(
      promptVersion,
      eq(promptVersion.internalId, promptChannel.versionInternalId)
    )
    .where(
      and(eq(prompt.organizationId, organizationId), isNull(prompt.archivedAt))
    )
    .orderBy(desc(prompt.updatedAt));
};
