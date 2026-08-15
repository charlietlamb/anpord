import type { Database } from "@anpord/db/client";
import { prompt, promptChannel, promptVersion } from "@anpord/db/schema";
import { PRODUCTION } from "@anpord/schema/prompts";
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

/**
 * A read projection, not a row read: latest comes from an aggregate over
 * versions while production comes through the channel pointer, so the two
 * columns need different joins.
 */
export const selectPromptList = (
  db: Database["Type"],
  organizationId: string
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
