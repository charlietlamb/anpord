import { createHash } from "node:crypto";
import { MAX_RUN_TRIALS } from "@anpord/schema/domain/eval-quota";
import type { EvalVariantResult } from "@anpord/schema/domain/eval-read-models";
import type {
  PlannedVariant,
  RerunIntent,
  RerunPlan,
  RerunSkip,
  RerunSkipReason,
  RerunSlot,
  RerunTarget,
} from "@anpord/schema/domain/eval-rerun";
import { RerunFingerprint } from "@anpord/schema/domain/eval-rerun";
import type { EvalSuite } from "@anpord/schema/domain/evals";
import { DateTime } from "effect";

const FINGERPRINT_LENGTH = 16;

export interface RerunCandidate {
  readonly caseId: string;
  readonly caseName: string;
  readonly results: readonly EvalVariantResult[];
}

export interface PlanRerun {
  readonly candidates: readonly RerunCandidate[];
  readonly intent: RerunIntent;
  readonly suite: EvalSuite;
}

type Wanted =
  | { readonly kind: "skip"; readonly reason: RerunSkipReason }
  | { readonly kind: "slots"; readonly slots: readonly RerunSlot[] };

export const passedCleanly = (result: EvalVariantResult) =>
  result.status === "finished" &&
  result.distribution.scored > 0 &&
  result.distribution.passed === result.distribution.scored;

const newestRunMillis = (candidate: RerunCandidate) =>
  candidate.results.reduce(
    (newest, result) =>
      Math.max(newest, DateTime.toEpochMillis(result.lastRunAt)),
    0
  );

const byNewestRun = (left: RerunCandidate, right: RerunCandidate) =>
  newestRunMillis(right) - newestRunMillis(left) ||
  left.caseId.localeCompare(right.caseId);

const slotOf = (
  candidate: RerunCandidate,
  variant: PlannedVariant
): RerunSlot => ({
  caseId: candidate.caseId,
  caseName: candidate.caseName,
  variant,
});

const repeatEachVariant = (
  candidate: RerunCandidate,
  intent: RerunIntent
): Wanted => {
  const hosted = candidate.results.filter(
    (result) => result.variant.sandbox !== "local"
  );
  if (hosted.length === 0) {
    return { kind: "skip", reason: "onlyLocal" };
  }

  const taken =
    intent.scope === "everyCase"
      ? hosted
      : hosted.filter((result) => !passedCleanly(result));
  if (taken.length === 0) {
    return { kind: "skip", reason: "nothingFailed" };
  }

  return {
    kind: "slots",
    slots: taken.map((result) =>
      slotOf(candidate, { kind: "existing", variant: result.variant })
    ),
  };
};

const onOneVariant = (
  candidate: RerunCandidate,
  intent: RerunIntent,
  target: Extract<RerunTarget, { kind: "onVariant" }>
): Wanted => {
  if (
    intent.scope === "onlyFailures" &&
    candidate.results.every(passedCleanly)
  ) {
    return { kind: "skip", reason: "nothingFailed" };
  }

  const already = candidate.results.find(
    (result) =>
      result.variant.harness === target.harness &&
      result.variant.model === target.model &&
      result.variant.sandbox === target.sandbox &&
      result.variant.profile === null
  );

  return {
    kind: "slots",
    slots: [
      slotOf(
        candidate,
        already === undefined
          ? {
              harness: target.harness,
              kind: "fresh",
              model: target.model,
              sandbox: target.sandbox,
            }
          : { kind: "existing", variant: already.variant }
      ),
    ],
  };
};

const wanted = (candidate: RerunCandidate, intent: RerunIntent): Wanted => {
  if (candidate.results.length === 0) {
    return { kind: "skip", reason: "neverRun" };
  }
  return intent.target.kind === "asBefore"
    ? repeatEachVariant(candidate, intent)
    : onOneVariant(candidate, intent, intent.target);
};

const variantKey = (variant: PlannedVariant) =>
  variant.kind === "existing"
    ? variant.variant.id
    : ["fresh", variant.harness, variant.model, variant.sandbox].join("/");

export const fingerprintOf = (
  slots: readonly RerunSlot[],
  trials: number
): RerunFingerprint =>
  RerunFingerprint.make(
    createHash("sha256")
      .update(
        `${slots
          .map((slot) => [slot.caseId, variantKey(slot.variant)].join("\u0000"))
          .join("\n")}\n${trials}`
      )
      .digest("hex")
      .slice(0, FINGERPRINT_LENGTH)
  );

const skipOf = (
  candidate: RerunCandidate,
  reason: RerunSkipReason
): RerunSkip => ({
  caseId: candidate.caseId,
  caseName: candidate.caseName,
  reason,
});

export const planRerun = ({
  candidates,
  intent,
  suite,
}: PlanRerun): RerunPlan => {
  const cap = Math.floor(MAX_RUN_TRIALS / intent.trials);
  const slots: RerunSlot[] = [];
  const skipped: RerunSkip[] = [];

  for (const candidate of [...candidates].sort(byNewestRun)) {
    const outcome = wanted(candidate, intent);

    if (outcome.kind === "skip") {
      skipped.push(skipOf(candidate, outcome.reason));
      continue;
    }

    if (slots.length + outcome.slots.length > cap) {
      skipped.push(skipOf(candidate, "overBatchLimit"));
      continue;
    }

    slots.push(...outcome.slots);
  }

  return {
    fingerprint: fingerprintOf(slots, intent.trials),
    skipped,
    slots,
    suite,
    trials: intent.trials,
  };
};
