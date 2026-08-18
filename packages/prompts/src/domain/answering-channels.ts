import { ChannelName } from "@anpord/schema/domain/prompts";
import { Effect, ParseResult, Schema } from "effect";
import type { ChannelRow } from "../repositories/prompt-channel-repository";
import { PromptStoreError } from "./errors";

const decodeChannel = Schema.decodeUnknown(ChannelName);

/**
 * Several channels may point at one version, but `ResolvedPrompt.channel` is
 * singular and is part of the public wire shape.
 *
 * Which one to name is settled alphabetically rather than by preferring a
 * channel: the organisation chooses which one answers a bare request, and a
 * pure function over these rows cannot know it. `listChannels` carries the
 * rest either way.
 */
const preferred = (left: ChannelRow, right: ChannelRow) =>
  left.channel <= right.channel ? left : right;

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
