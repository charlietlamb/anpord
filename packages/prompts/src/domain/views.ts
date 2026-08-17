import { Channel } from "@anpord/schema/domain/channels";
import { Deployment } from "@anpord/schema/domain/deployments";
import {
  type ChannelName,
  ChannelPlacement,
  PromptSummary,
  ResolvedPrompt,
} from "@anpord/schema/domain/prompts";
import { Effect, ParseResult, Schema } from "effect";
import type { ChannelCountRow } from "../repositories/channel-repository";
import type { DeploymentRow } from "../repositories/deployment-repository";
import type { ChannelRow } from "../repositories/prompt-channel-repository";
import type { PromptListRow } from "../repositories/prompt-list-query";
import type { VersionRow } from "../repositories/prompt-version-repository";
import { PromptStoreError } from "./errors";

const decodeChannel = Schema.decodeUnknown(Channel);
const decodeDeployment = Schema.decodeUnknown(Deployment);
const decodePlacement = Schema.decodeUnknown(ChannelPlacement);
const decodeResolved = Schema.decodeUnknown(ResolvedPrompt);
const decodeSummary = Schema.decodeUnknown(PromptSummary);

const asStoreError = (operation: string) => (issue: ParseResult.ParseError) =>
  new PromptStoreError({
    cause: ParseResult.TreeFormatter.formatErrorSync(issue),
    operation,
  });

export interface PromptIdentity {
  readonly id: string;
  readonly name: string;
}

interface JoinedAuthor {
  readonly image: string | null;
  readonly name: string | null;
}

/**
 * An author is read through a left join, so a deleted user arrives as a row of
 * nulls rather than as no row at all. Nobody is a truer answer than a person
 * with no name, and without this the whole page fails to decode over one
 * deleted account.
 */
const authorOf = (author: JoinedAuthor | null) =>
  author === null || author.name === null
    ? null
    : { image: author.image, name: author.name };

export const toResolved = (
  identity: PromptIdentity,
  channel: ChannelName | null,
  row: VersionRow
): Effect.Effect<ResolvedPrompt, PromptStoreError> =>
  decodeResolved({
    author: authorOf(row.author),
    channel,
    commitMessage: row.commitMessage,
    config: row.config ?? {},
    content: row.content,
    createdAt: row.createdAt,
    id: identity.id,
    name: identity.name,
    version: row.version,
    versionId: row.internalId,
  }).pipe(Effect.mapError(asStoreError("views.toResolved")));

export const toPlacement = (
  row: ChannelRow
): Effect.Effect<ChannelPlacement, PromptStoreError> =>
  decodePlacement(row).pipe(Effect.mapError(asStoreError("views.toPlacement")));

export const toChannel = (
  row: ChannelCountRow
): Effect.Effect<Channel, PromptStoreError> =>
  decodeChannel(row).pipe(Effect.mapError(asStoreError("views.toChannel")));

/** A move that lowers the version is a rollback, and one that repeats the
 * serving version moved nothing. Both read differently from a move forward, so
 * they are named here rather than left to the reader to work out by comparing
 * two numbers. */
const kindOf = (row: DeploymentRow): Deployment["kind"] => {
  if (row.fromVersion === null) {
    return "first";
  }
  if (row.toVersion === row.fromVersion) {
    return "repeat";
  }
  return row.toVersion < row.fromVersion ? "rollback" : "promotion";
};

export const toDeployment = (
  row: DeploymentRow
): Effect.Effect<Deployment, PromptStoreError> =>
  decodeDeployment({
    channel: row.channel,
    deployedAt: row.deployedAt,
    deployedBy: authorOf(row.deployedBy),
    fromVersion: row.fromVersion,
    id: row.internalId,
    kind: kindOf(row),
    promptId: row.promptId,
    promptName: row.promptName,
    toVersion: row.toVersion,
  }).pipe(Effect.mapError(asStoreError("views.toDeployment")));

export const toSummary = (
  row: PromptListRow
): Effect.Effect<PromptSummary, PromptStoreError> =>
  decodeSummary({
    description: row.description,
    id: row.id,
    latestVersion: row.latestVersion,
    name: row.name,
    productionVersion: row.productionVersion,
    updatedAt: row.updatedAt,
  }).pipe(Effect.mapError(asStoreError("views.toSummary")));
