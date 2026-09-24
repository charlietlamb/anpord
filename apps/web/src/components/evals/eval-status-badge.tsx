import type { EvalValidation } from "@anpord/schema/domain/eval-validations";
import type {
  EvalDistribution,
  EvalTrialStatus,
} from "@anpord/schema/domain/evals";
import { StatusBadge } from "@anpord/ui/components/ui/status-badge";
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
