import { Database } from "@anpord/db/client";
import type { OrganizationId } from "@anpord/schema/domain/actor";
import { Context, Effect, Layer } from "effect";
import type { PromptStoreError } from "../domain/errors";
import {
  type DeploymentListParams,
  selectDeploymentList,
} from "./deployment-list-query";
import { tryStore } from "./query";

export interface DeploymentRow {
  readonly channel: string;
  readonly deployedAt: Date;
  /** Left-joined onto a nullable actor, so a deleted user arrives as a row of
   * nulls rather than as no row. */
  readonly deployedBy: {
    readonly image: string | null;
    readonly name: string | null;
  } | null;
  /** Null on the first deployment to a channel, which is a different act from
   * moving one and reads differently. */
  readonly fromVersion: number | null;
  readonly internalId: string;
  readonly promptId: string;
  readonly promptName: string;
  readonly toVersion: number;
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

export const DeploymentRepositoryLive = Layer.effect(
  DeploymentRepository,
  Effect.gen(function* () {
    const db = yield* Database;

    return {
      list: (organizationId, params) =>
        tryStore("deployment.list", () =>
          selectDeploymentList(db, organizationId, params)
        ),
    } satisfies DeploymentRepositoryShape;
  })
);
