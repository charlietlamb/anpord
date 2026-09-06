import type { VersionNumber } from "@anpord/schema/domain/prompts";
import type { Release } from "@anpord/schema/domain/releases";
import { withinGate } from "./bucketing";

type DecisionReason = "pinned" | "rollout" | "no-unit";

export interface Decision {
  readonly percent: number | null;
  readonly reason: DecisionReason;
  readonly version: VersionNumber;
}

/* No clock, store or randomness, so the same release and unit always agree. A
   caller with no unit gets `previous`: a coin flip would let one conversation
   see two versions in consecutive turns. */
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
