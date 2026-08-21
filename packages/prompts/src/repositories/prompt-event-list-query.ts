import type { Database } from "@anpord/db/client";
import { user } from "@anpord/db/schema/auth/users";
import { promptEvent } from "@anpord/db/schema/prompts/prompt-events";
import { promptVersion } from "@anpord/db/schema/prompts/prompt-versions";
import { prompt } from "@anpord/db/schema/prompts/prompts";
import type { OrganizationId } from "@anpord/schema/domain/actor";
import type { PromptEventKind } from "@anpord/schema/domain/prompt-events";
import { aliasedTable, and, desc, eq, sql } from "drizzle-orm";
import type { ActivityCursorPayload } from "../domain/activity-cursor";

const fromVersion = aliasedTable(promptVersion, "from_version");
const atVersion = aliasedTable(promptVersion, "at_version");

export interface PromptEventListParams {
  readonly channel?: string;
  readonly cursor?: ActivityCursorPayload;
  readonly kind?: PromptEventKind;
  readonly limit: number;
  readonly promptId?: string;
}

/** The predicate mirrors the `order by` tuple for tuple. Comparing the pair in
 * one shot is what stops two events sharing a millisecond from being skipped
 * when they straddle a page boundary. */
export const afterCursor = (cursor: ActivityCursorPayload) =>
  sql`(${promptEvent.createdAt}, ${promptEvent.internalId}) < (${cursor.at}::timestamp, ${cursor.id})`;

/** Built out here rather than inline in the layer so the joins and the tenant
 * predicate can be asserted without a database. */
export const selectPromptEventList = (
  db: Database["Type"],
  organizationId: OrganizationId,
  params: PromptEventListParams
) => {
  const where = [eq(prompt.organizationId, organizationId)];

  if (params.channel !== undefined) {
    where.push(eq(promptEvent.channel, params.channel));
  }
  if (params.kind !== undefined) {
    where.push(eq(promptEvent.kind, params.kind));
  }
  if (params.promptId !== undefined) {
    where.push(eq(prompt.id, params.promptId));
  }
  if (params.cursor !== undefined) {
    where.push(afterCursor(params.cursor));
  }

  return (
    db
      .select({
        actor: { image: user.image, name: user.name },
        at: promptEvent.createdAt,
        channel: promptEvent.channel,
        from: fromVersion.version,
        internalId: promptEvent.internalId,
        kind: promptEvent.kind,
        message: atVersion.commitMessage,
        promptId: prompt.id,
        version: atVersion.version,
      })
      .from(promptEvent)
      .innerJoin(prompt, eq(prompt.internalId, promptEvent.promptInternalId))
      /* Left-joined throughout: a version may be gone and an actor may have
         left, and neither should take the event with them. */
      .leftJoin(
        atVersion,
        eq(atVersion.internalId, promptEvent.versionInternalId)
      )
      .leftJoin(
        fromVersion,
        eq(fromVersion.internalId, promptEvent.fromVersionInternalId)
      )
      .leftJoin(user, eq(user.id, promptEvent.actorId))
      .where(and(...where))
      .orderBy(desc(promptEvent.createdAt), desc(promptEvent.internalId))
      .limit(params.limit)
  );
};
