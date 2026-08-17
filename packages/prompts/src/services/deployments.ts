import type { Actor } from "@anpord/schema/domain/actor";
import { Deployment } from "@anpord/schema/domain/deployments";
import { PAGE_LIMIT_MAX } from "@anpord/schema/domain/prompts";
import { Context, Effect, Layer, ParseResult, Schema } from "effect";
import { PromptStoreError } from "../domain/errors";
import {
  DeploymentRepository,
  type DeploymentRow,
} from "../repositories/deployment-repository";

export interface DeploymentQuery {
  readonly channel?: string;
  readonly cursor?: Date;
  readonly limit?: number;
  readonly promptId?: string;
}

export interface DeploymentsShape {
  readonly list: (
    actor: Actor,
    query: DeploymentQuery
  ) => Effect.Effect<readonly Deployment[], PromptStoreError>;
}

export class Deployments extends Context.Tag("@anpord/prompts/Deployments")<
  Deployments,
  DeploymentsShape
>() {}

/** A deployment that lowers the version is a rollback and one that repeats the
 * serving version moved nothing, both of which read differently from a move
 * forward and are worth naming rather than leaving the reader to compare two
 * numbers. */
const kindOf = (row: DeploymentRow): Deployment["kind"] => {
  if (row.fromVersion === null) {
    return "first";
  }
  if (row.toVersion === row.fromVersion) {
    return "repeat";
  }
  return row.toVersion < row.fromVersion ? "rollback" : "promotion";
};

const decodeDeployment = Schema.decodeUnknown(Deployment);

const toDeployment = (row: DeploymentRow) => ({
  channel: row.channel,
  deployedAt: row.deployedAt,
  deployedBy: row.deployedBy,
  fromVersion: row.fromVersion,
  id: row.internalId,
  kind: kindOf(row),
  promptId: row.promptId,
  promptName: row.promptName,
  toVersion: row.toVersion,
});

/** Decoded rather than asserted: the row comes from SQL, and the branded types
 * are the only thing standing between a column changing shape and a caller
 * receiving nonsense. */
const decodeRows = (rows: readonly DeploymentRow[]) =>
  Effect.forEach(rows, (row) => decodeDeployment(toDeployment(row))).pipe(
    Effect.mapError(
      (issue: ParseResult.ParseError) =>
        new PromptStoreError({
          cause: ParseResult.TreeFormatter.formatErrorSync(issue),
          operation: "deployment.decode",
        })
    )
  );

export const DeploymentsLive = Layer.effect(
  Deployments,
  Effect.gen(function* () {
    const deployments = yield* DeploymentRepository;

    return {
      list: (actor, query) =>
        deployments
          .list(actor.organizationId, {
            channel: query.channel,
            cursor: query.cursor,
            limit: Math.min(query.limit ?? PAGE_LIMIT_MAX, PAGE_LIMIT_MAX),
            promptId: query.promptId,
          })
          .pipe(
            Effect.flatMap(decodeRows),
            Effect.withSpan("Deployments.list"),
            Effect.annotateLogs({ orgId: actor.organizationId })
          ),
    } satisfies DeploymentsShape;
  })
);
