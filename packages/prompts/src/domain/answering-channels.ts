import { ChannelName, PRODUCTION } from "@anpord/schema/domain/prompts";
import { Effect, ParseResult, Schema } from "effect";
import type { ChannelRow } from "../repositories/prompt-channel-repository";
import { PromptStoreError } from "./errors";

const decodeChannel = Schema.decodeUnknown(ChannelName);

/**
 * Several channels may point at one version, but `ResolvedPrompt.channel` is
 * singular and is part of the public wire shape. Production wins so the field
 * answers the question callers actually ask; `listChannels` carries the rest.
 */
const preferred = (left: ChannelRow, right: ChannelRow) => {
  if (left.channel === PRODUCTION) {
    return left;
  }

  if (right.channel === PRODUCTION) {
    return right;
  }

  return left.channel <= right.channel ? left : right;
};

export const answeringChannels = (
  rows: readonly ChannelRow[]
): Effect.Effect<
  (versionInternalId: string) => ChannelName | null,
  PromptStoreError
> =>
  Effect.gen(function* () {
    const byVersion = new Map<string, ChannelRow>();

    for (const row of rows) {
      const existing = byVersion.get(row.versionInternalId);
      byVersion.set(
        row.versionInternalId,
        existing ? preferred(existing, row) : row
      );
    }

    const decoded = new Map<string, ChannelName>();

    for (const [versionInternalId, row] of byVersion) {
      decoded.set(versionInternalId, yield* decodeChannel(row.channel));
    }

    return (versionInternalId: string) =>
      decoded.get(versionInternalId) ?? null;
  }).pipe(
    Effect.mapError(
      (issue: ParseResult.ParseError) =>
        new PromptStoreError({
          cause: ParseResult.TreeFormatter.formatErrorSync(issue),
          operation: "answeringChannels",
        })
    )
  );
