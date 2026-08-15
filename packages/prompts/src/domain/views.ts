import {
  type ChannelName,
  PromptSummary,
  ResolvedPrompt,
} from "@anpord/schema/prompts";
import { Effect, ParseResult, Schema } from "effect";
import type { PromptListRow } from "../repositories/prompt-list-query";
import type { VersionRow } from "../repositories/prompt-version-repository";
import { PromptStoreError } from "./errors";

const decodeResolved = Schema.decodeUnknown(ResolvedPrompt);
const decodeSummary = Schema.decodeUnknown(PromptSummary);

/**
 * A row that cannot decode means storage holds something the contract forbids —
 * a bad migration or an out-of-band write — so it fails loudly here rather than
 * reaching callers as a value that only looks valid.
 */
const asStoreError = (operation: string) => (issue: ParseResult.ParseError) =>
  new PromptStoreError({
    cause: ParseResult.TreeFormatter.formatErrorSync(issue),
    operation,
  });

/** Identity comes off the prompt row; brands are applied by the decode below. */
export interface PromptIdentity {
  readonly id: string;
  readonly name: string;
}

/** Rows carry storage concerns (internal ids, FKs); views carry what callers read. */
export const toResolved = (
  identity: PromptIdentity,
  channel: ChannelName | null,
  row: VersionRow
): Effect.Effect<ResolvedPrompt, PromptStoreError> =>
  decodeResolved({
    author: row.author,
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
