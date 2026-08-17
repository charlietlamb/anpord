import { Schema } from "effect";
import {
  ChannelName,
  ChannelPlacement,
  PromptId,
  PromptName,
  VersionNumber,
} from "./prompts";

/**
 * One prompt and every channel currently pointed at it.
 *
 * `latestVersion` travels with the row because drift is the reason this view
 * exists: a channel is only interesting relative to the newest version, and
 * asking the caller to join two lists to work that out would put the
 * comparison in the wrong place.
 */
export const PromptPlacements = Schema.Struct({
  id: PromptId,
  latestVersion: Schema.NullOr(VersionNumber),
  name: PromptName,
  placements: Schema.Array(ChannelPlacement),
}).annotations({
  description: "Where every channel points for one prompt.",
  identifier: "PromptPlacements",
});
export type PromptPlacements = typeof PromptPlacements.Type;

/**
 * Counted across the organisation rather than the page, so the summary does
 * not change as the reader pages through it.
 */
export const PlacementTotals = Schema.Struct({
  behind: Schema.Int,
  prompts: Schema.Int,
});
export type PlacementTotals = typeof PlacementTotals.Type;

export const PlacementPage = Schema.Struct({
  items: Schema.Array(PromptPlacements),
  /** Opaque to callers, and null once the last page has been read. */
  nextCursor: Schema.NullOr(Schema.String),
  totals: PlacementTotals,
});
export type PlacementPage = typeof PlacementPage.Type;

/** One channel of one prompt, moved to one version. */
export const PlacementChange = Schema.Struct({
  channel: ChannelName,
  promptId: PromptId,
  version: VersionNumber,
});
export type PlacementChange = typeof PlacementChange.Type;

/**
 * A batch is capped so one request cannot move an unbounded number of
 * channels. Well above the largest plausible catch-up and far below anything
 * that would hold a transaction open.
 */
export const PLACEMENT_BATCH_MAX = 100;

export const ApplyPlacementsRequest = Schema.Struct({
  changes: Schema.Array(PlacementChange).pipe(
    Schema.minItems(1),
    Schema.maxItems(PLACEMENT_BATCH_MAX)
  ),
}).annotations({
  description: "Point several channels at several versions in one request.",
  identifier: "ApplyPlacementsRequest",
});
export type ApplyPlacementsRequest = typeof ApplyPlacementsRequest.Type;

/**
 * What became of one change.
 *
 * Applied per change rather than failing the batch: a caller who moved eight
 * channels and got one rejection needs to know which one, and re-sending the
 * other seven would move them twice.
 */
export const PlacementResult = Schema.Struct({
  change: PlacementChange,
  /** Absent when the change applied. */
  error: Schema.NullOr(Schema.String),
});
export type PlacementResult = typeof PlacementResult.Type;

export const ApplyPlacementsResponse = Schema.Struct({
  results: Schema.Array(PlacementResult),
});
export type ApplyPlacementsResponse = typeof ApplyPlacementsResponse.Type;
