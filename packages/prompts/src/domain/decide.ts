import type { VersionNumber } from "@anpord/schema/domain/prompts";
import type { Release } from "@anpord/schema/domain/releases";
import { withinGate } from "./bucketing";

type DecisionReason = "pinned" | "rollout" | "no-unit";

export interface Decision {
  readonly percent: number | null;
  readonly reason: DecisionReason;
  readonly version: VersionNumber;
}

/**
 * Which version a release serves this caller. Pure and total: it reads no
 * clock, no store and no randomness, so the same release and unit always agree
 * and a test needs nothing but the two arguments.
 *
 * A caller that sends no unit gets `previous` rather than a coin flip. Random
 * assignment would let one conversation see two versions in consecutive turns,
 * which is worse than not participating at all.
 */
export const decide = (
  release: Release,
  unit: string | undefined
): Decision => {
  if (release._tag === "Pinned") {
    return { percent: null, reason: "pinned", version: release.version };
  }

  if (unit === undefined) {
    return {
      percent: release.percent,
      reason: "no-unit",
      version: release.previous,
    };
  }

  return {
    percent: release.percent,
    reason: "rollout",
    version: withinGate(release.exposureSalt, unit, release.percent)
      ? release.version
      : release.previous,
  };
};
