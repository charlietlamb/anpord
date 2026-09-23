import type { EvalValidation } from "@anpord/schema/domain/eval-validations";
import type {
  EvalDistribution,
  EvalTrialStatus,
} from "@anpord/schema/domain/evals";
import { StatusBadge } from "@anpord/ui/components/ui/status-badge";
import { cn } from "@anpord/ui/lib/utils";
import {
  CheckCircleIcon,
  CircleDashedIcon,
  CircleNotchIcon,
  type Icon,
  MinusCircleIcon,
  WarningCircleIcon,
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
  size,
}: {
  readonly distribution: Pick<EvalDistribution, "passed" | "scored">;
  readonly size?: "sm" | "xs";
}) {
  const { passed, scored } = distribution;

  if (scored === 0) {
    return (
      <StatusBadge icon={MinusCircleIcon} size={size} tone="neutral">
        Not scored
      </StatusBadge>
    );
  }

  const clean = passed === scored;

  return (
    <StatusBadge
      icon={clean ? CheckCircleIcon : XCircleIcon}
      size={size}
      tone={clean ? "positive" : "critical"}
    >
      {passed}/{scored} passed
    </StatusBadge>
  );
}

const VALIDATION_BADGES: Record<
  EvalValidation["status"],
  { readonly icon: Icon; readonly label: string; readonly tone: EvalTone }
> = {
  error: { icon: WarningCircleIcon, label: "Errored", tone: "critical" },
  failed: { icon: XCircleIcon, label: "Failed", tone: "critical" },
  passed: { icon: CheckCircleIcon, label: "Passed", tone: "positive" },
  queued: { icon: CircleDashedIcon, label: "Queued", tone: "pending" },
  running: { icon: CircleNotchIcon, label: "Running", tone: "pending" },
  skipped: { icon: MinusCircleIcon, label: "Skipped", tone: "neutral" },
};

export function ValidationStatusPill({
  status,
}: {
  readonly status: EvalValidation["status"];
}) {
  const { icon, label, tone } = VALIDATION_BADGES[status];

  return (
    <StatusBadge icon={icon} tone={tone}>
      {label}
    </StatusBadge>
  );
}
