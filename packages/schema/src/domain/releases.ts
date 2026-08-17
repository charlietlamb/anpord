import { Schema } from "effect";
import { VersionNumber } from "./prompts";

export const Percent = Schema.Int.pipe(
  Schema.between(1, 99),
  Schema.brand("Percent")
).annotations({
  description:
    "The share of callers a rollout serves its new version to. Neither end is " +
    "allowed: 0 and 100 are a pinned release, not a rollout.",
  identifier: "Percent",
});
export type Percent = typeof Percent.Type;

/** Generated once per rollout and never changed while it runs. Two salts
 * rather than one so that widening a rollout moves only the gate: everyone
 * already served the new version keeps it. */
export const Salt = Schema.String.pipe(
  Schema.minLength(16),
  Schema.maxLength(64),
  Schema.brand("Salt")
);
export type Salt = typeof Salt.Type;

export const PinnedRelease = Schema.Struct({
  _tag: Schema.Literal("Pinned"),
  version: VersionNumber,
});

/**
 * Two versions at once. `version` goes to callers inside the gate and
 * `previous` to everyone else, including every caller that sends no unit —
 * so a rollout a caller cannot participate in degrades to what they had
 * before it started.
 */
export const RolloutRelease = Schema.Struct({
  _tag: Schema.Literal("Rollout"),
  assignmentSalt: Salt,
  exposureSalt: Salt,
  percent: Percent,
  previous: VersionNumber,
  version: VersionNumber,
});

export const Release = Schema.Union(PinnedRelease, RolloutRelease).annotations({
  description: "What a channel points at.",
  identifier: "Release",
});
export type Release = typeof Release.Type;

export const pinned = (version: VersionNumber): Release => ({
  _tag: "Pinned",
  version,
});

/** Every version a release can serve, which is what the delete guard and the
 * cache warmer both need and neither should derive by hand. */
export const versionsOf = (release: Release): readonly VersionNumber[] =>
  release._tag === "Pinned"
    ? [release.version]
    : [release.version, release.previous];

/** The single version a release serves, when there is one. A rollout has no
 * answer, which is why the column it denormalises into is nullable. */
export const pinnedVersion = (release: Release): VersionNumber | null =>
  release._tag === "Pinned" ? release.version : null;
