import { Database } from "@anpord/db/client";
import { user } from "@anpord/db/schema/auth/users";
import { promptChannelEvent } from "@anpord/db/schema/prompts/prompt-channel-events";
import { promptVersion } from "@anpord/db/schema/prompts/prompt-versions";
import { prompt } from "@anpord/db/schema/prompts/prompts";
import type { OrganizationId } from "@anpord/schema/domain/actor";
import { aliasedTable, and, desc, eq, lt } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";
import type { PromptStoreError } from "../domain/errors";
import { tryStore } from "./query";

export interface DeploymentRow {
  readonly channel: string;
  readonly deployedAt: Date;
  readonly deployedBy: {
    readonly image: string | null;
    readonly name: string;
  } | null;
  /** Null on the first deployment to a channel, which is a different act from
   * moving one and reads differently. */
  readonly fromVersion: number | null;
  readonly internalId: string;
  readonly promptId: string;
  readonly promptName: string;
  readonly toVersion: number;
}

interface DeploymentListParams {
  readonly channel?: string;
  /** The `deployedAt` of the last row already read. Keyset rather than offset,
   * so a deployment made while someone is reading cannot shift the page under
   * them. */
  readonly cursor?: Date;
  readonly limit: number;
  readonly promptId?: string;
}

export interface DeploymentRepositoryShape {
  readonly list: (
    organizationId: OrganizationId,
    params: DeploymentListParams
  ) => Effect.Effect<readonly DeploymentRow[], PromptStoreError>;
}

export class DeploymentRepository extends Context.Tag(
  "@anpord/prompts/DeploymentRepository"
)<DeploymentRepository, DeploymentRepositoryShape>() {}

const fromVersion = aliasedTable(promptVersion, "from_version");
const toVersion = aliasedTable(promptVersion, "to_version");

export const DeploymentRepositoryLive = Layer.effect(
  DeploymentRepository,
  Effect.gen(function* () {
    const db = yield* Database;

    return {
      list: (organizationId, params) =>
        tryStore("deployment.list", () => {
          const where = [eq(prompt.organizationId, organizationId)];

          if (params.channel !== undefined) {
            where.push(eq(promptChannelEvent.channel, params.channel));
          }
          if (params.promptId !== undefined) {
            where.push(eq(prompt.id, params.promptId));
          }
          if (params.cursor !== undefined) {
            where.push(lt(promptChannelEvent.createdAt, params.cursor));
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
              eq(
                fromVersion.internalId,
                promptChannelEvent.fromVersionInternalId
              )
            )
            .leftJoin(user, eq(user.id, promptChannelEvent.actorId))
            .where(and(...where))
            .orderBy(desc(promptChannelEvent.createdAt))
            .limit(params.limit);
        }),
    } satisfies DeploymentRepositoryShape;
  })
);
