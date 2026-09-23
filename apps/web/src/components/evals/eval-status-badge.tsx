import type {
  EvalDistribution,
  EvalTrialStatus,
} from "@anpord/schema/domain/evals";
import { StatusBadge } from "@anpord/ui/components/ui/status-badge";
import { cn } from "@anpord/ui/lib/utils";
import {
  CheckCircleIcon,
  MinusCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { type EvalTone, trialGlyph, trialTone } from "@/lib/evals/eval-status";

const TONE_CLASSES: Record<EvalTone, string> = {
  critical: "text-destructive",
  neutral: "text-muted-foreground",
  pending: "text-warning",
  positive: "text-success",
};

const BADGE_BACKGROUNDS: Record<EvalTone, string> = {
  critical: "bg-destructive/15",
  neutral: "bg-muted",
  pending: "bg-warning/15",
  positive: "bg-success/15",
};

export function TrialStatusIcon({
  status,
}: {
  readonly status: EvalTrialStatus;
}) {
  const Glyph = trialGlyph(status);
  const moving = status === "running";

  return (
    <Glyph
      className={cn(
        "size-3.5 shrink-0",
        TONE_CLASSES[trialTone(status)],
        moving && "animate-spin motion-reduce:animate-none"
      )}
      weight={moving ? "bold" : "fill"}
    />
  );
}

export function TrialBadge({
  ordinal,
  status,
}: {
  readonly ordinal: number;
  readonly status: EvalTrialStatus;
}) {
  const tone = trialTone(status);
  return (
    <span
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-md font-medium font-mono text-xs tabular-nums",
        TONE_CLASSES[tone],
        BADGE_BACKGROUNDS[tone]
      )}
      title={`Trial ${ordinal}: ${status}`}
    >
      <span className="sr-only">Trial </span>
      {ordinal}
      <span className="sr-only">: {status}</span>
    </span>
  );
}

const TRIAL_LABELS: Record<EvalTrialStatus, string> = {
  failed: "Failed",
  passed: "Passed",
  queued: "Queued",
  running: "Running",
  void: "Not scored",
};

export function TrialStatusPill({
  status,
}: {
  readonly status: EvalTrialStatus;
}) {
  return (
    <StatusBadge icon={trialGlyph(status)} tone={trialTone(status)}>
      {TRIAL_LABELS[status]}
    </StatusBadge>
  );
}

export function DistributionPill({
  distribution,
}: {
  readonly distribution: Pick<EvalDistribution, "passed" | "scored">;
}) {
  const { passed, scored } = distribution;

  if (scored === 0) {
    return (
      <StatusBadge icon={MinusCircleIcon} tone="neutral">
        Not scored
      </StatusBadge>
    );
  }

  return passed === scored ? (
    <StatusBadge icon={CheckCircleIcon} tone="positive">
      {passed}/{scored} passed
    </StatusBadge>
  ) : (
    <StatusBadge icon={XCircleIcon} tone="critical">
      {passed}/{scored} passed
    </StatusBadge>
  );
}
