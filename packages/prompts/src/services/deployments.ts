import type { Actor } from "@anpord/schema/domain/actor";
import type { DeploymentPage } from "@anpord/schema/domain/deployments";
import { Context, Effect, Layer } from "effect";
import {
  decodeDeploymentCursor,
  deploymentCursorFor,
  encodeDeploymentCursor,
} from "../domain/deployment-cursor";
import type { PromptError } from "../domain/errors";
import { toDeployment } from "../domain/views";
import { DeploymentRepository } from "../repositories/deployment-repository";

export interface DeploymentQuery {
  readonly channel?: string;
  readonly cursor?: string;
  readonly limit: number;
  readonly promptId?: string;
}

export interface DeploymentsShape {
  readonly list: (
    actor: Actor,
    query: DeploymentQuery
  ) => Effect.Effect<DeploymentPage, PromptError>;
}

export class Deployments extends Context.Tag("@anpord/prompts/Deployments")<
  Deployments,
  DeploymentsShape
>() {}

export const DeploymentsLive = Layer.effect(
  Deployments,
  Effect.gen(function* () {
    const deployments = yield* DeploymentRepository;

    return {
      list: (actor, query) =>
        Effect.gen(function* () {
          const cursor =
            query.cursor === undefined
              ? undefined
              : yield* decodeDeploymentCursor(query.cursor);

          /** One more than asked for, so a full page can be told apart from the
           * last one without a second request that returns nothing. */
          const rows = yield* deployments.list(actor.organizationId, {
            channel: query.channel,
            cursor,
            limit: query.limit + 1,
            promptId: query.promptId,
          });

          const page = rows.slice(0, query.limit);
          const last = page.at(-1);

          return {
            items: yield* Effect.all(page.map(toDeployment)),
            nextCursor:
              rows.length > query.limit && last !== undefined
                ? encodeDeploymentCursor(deploymentCursorFor(last))
                : null,
          } satisfies DeploymentPage;
        }).pipe(
          Effect.withSpan("Deployments.list"),
          Effect.annotateLogs({ orgId: actor.organizationId })
        ),
    } satisfies DeploymentsShape;
  })
);
