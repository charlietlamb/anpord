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

/* Two salts, not one, so widening a rollout moves only the gate and nobody is moved back. */
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

/* A caller that sends no unit gets `previous`, so a rollout they cannot join degrades to what they had. */
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

export const versionsOf = (release: Release): readonly VersionNumber[] =>
  release._tag === "Pinned"
    ? [release.version]
    : [release.version, release.previous];

/* Null for a rollout, which is why the column it denormalises into is nullable. */
export const pinnedVersion = (release: Release): VersionNumber | null =>
  release._tag === "Pinned" ? release.version : null;
