import type { EvalValidation } from "@anpord/schema/domain/eval-validations";
import type {
  EvalDistribution,
  EvalTrialStatus,
} from "@anpord/schema/domain/evals";
import type { StatusTone } from "@anpord/ui/components/ui/status-badge";
import {
  CheckCircleIcon,
  CircleDashedIcon,
  CircleHalfIcon,
  CircleNotchIcon,
  type Icon,
  MinusCircleIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react";

export interface PresentedStatus {
  readonly icon: Icon;
  readonly label: string;
  readonly tone: StatusTone;
}

const TRIAL: Record<EvalTrialStatus, PresentedStatus> = {
  failed: { icon: XCircleIcon, label: "Failed", tone: "destructive" },
  passed: { icon: CheckCircleIcon, label: "Passed", tone: "positive" },
  queued: { icon: CircleDashedIcon, label: "Queued", tone: "pending" },
  running: { icon: CircleNotchIcon, label: "Running", tone: "pending" },
  void: { icon: CircleHalfIcon, label: "Not scored", tone: "pending" },
};

const VALIDATION: Record<EvalValidation["status"], PresentedStatus> = {
  error: { icon: WarningCircleIcon, label: "Errored", tone: "destructive" },
  failed: { icon: XCircleIcon, label: "Failed", tone: "destructive" },
  passed: { icon: CheckCircleIcon, label: "Passed", tone: "positive" },
  queued: { icon: CircleDashedIcon, label: "Queued", tone: "pending" },
  running: { icon: CircleNotchIcon, label: "Running", tone: "pending" },
  skipped: { icon: MinusCircleIcon, label: "Skipped", tone: "secondary" },
};

export const trialStatus = (status: EvalTrialStatus) => TRIAL[status];

export const validationStatus = (status: EvalValidation["status"]) =>
  VALIDATION[status];

export const distributionStatus = ({
  passed,
  scored,
}: Pick<EvalDistribution, "passed" | "scored">): PresentedStatus => {
  if (scored === 0) {
    return { icon: MinusCircleIcon, label: "Not scored", tone: "secondary" };
  }

  return passed === scored
    ? {
        icon: CheckCircleIcon,
        label: `${passed}/${scored} passed`,
        tone: "positive",
      }
    : {
        icon: XCircleIcon,
        label: `${passed}/${scored} passed`,
        tone: "destructive",
      };
};
