import { Channel } from "@anpord/schema/domain/channels";
import {
  type DeploymentKind,
  PromptActivityEntry,
} from "@anpord/schema/domain/prompt-activity";
import {
  type ChannelName,
  ChannelPlacement,
  PromptSummary,
  ResolvedPrompt,
} from "@anpord/schema/domain/prompts";
import { Effect, ParseResult, Schema } from "effect";
import type { ChannelCountRow } from "../repositories/channel-repository";
import type { ChannelRow } from "../repositories/prompt-channel-repository";
import type { PromptEventRow } from "../repositories/prompt-event-repository";
import type { PromptListRow } from "../repositories/prompt-list-query";
import type { VersionRow } from "../repositories/prompt-version-repository";
import { PromptStoreError } from "./errors";

const decodeChannel = Schema.decodeUnknown(Channel);
const decodeActivityEntry = Schema.decodeUnknown(PromptActivityEntry);
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

/* A left join delivers a deleted user as a row of nulls, which would otherwise
   fail the whole page's decode. */
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

type PlacedRow = Omit<ChannelRow, "versionInternalId">;

export const toPlacement = (
  row: PlacedRow
): Effect.Effect<ChannelPlacement, PromptStoreError> =>
  decodePlacement({
    channel: row.channel,
    updatedAt: row.updatedAt,
    updatedBy: authorOf(row.updatedBy),
    version: row.version,
  }).pipe(Effect.mapError(asStoreError("views.toPlacement")));

export const toChannel = (
  row: ChannelCountRow
): Effect.Effect<Channel, PromptStoreError> =>
  decodeChannel(row).pipe(Effect.mapError(asStoreError("views.toChannel")));

/* Read off the two versions rather than stored, so it cannot disagree with
   them. */
const moveOf = (row: PromptEventRow): DeploymentKind => {
  if (row.from === null) {
    return "first";
  }
  if (row.version === null || row.version === row.from) {
    return "repeat";
  }
  return row.version < row.from ? "rollback" : "promotion";
};

/* Decoded, not asserted: a kind written by a later build is a store failure,
   not a value to hand the page as valid. */
export const toActivityEntry = (
  row: PromptEventRow
): Effect.Effect<PromptActivityEntry, PromptStoreError> =>
  decodeActivityEntry({
    _tag: row.kind,
    actor: authorOf(row.actor),
    at: row.at,
    ...(row.kind === "deployed"
      ? {
          channel: row.channel,
          from: row.from,
          move: moveOf(row),
          to: row.version,
        }
      : { version: row.version }),
    ...(row.kind === "saved" ? { message: row.message } : {}),
    id: row.internalId,
  }).pipe(Effect.mapError(asStoreError("views.toActivityEntry")));

export const toSummary = (
  row: PromptListRow
): Effect.Effect<PromptSummary, PromptStoreError> =>
  decodeSummary({
    author: authorOf(row.author),
    description: row.description,
    id: row.id,
    latestVersion: row.latestVersion,
    name: row.name,
    productionVersion: row.productionVersion,
    updatedAt: row.updatedAt,
  }).pipe(Effect.mapError(asStoreError("views.toSummary")));
