import { ChannelName } from "@anpord/schema/domain/prompts";
import { Effect, ParseResult, Schema } from "effect";
import type { ChannelRow } from "../repositories/prompt-channel-repository";
import { PromptStoreError } from "./errors";

const decodeChannel = Schema.decodeUnknown(ChannelName);

/* Several channels may share a version but the wire shape names one, so the
   tie is broken alphabetically -- these rows cannot know the org's default. */
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
