import type { EvalTrialStatus } from "@anpord/schema/domain/evals";
import {
  CheckCircleIcon,
  CircleDashedIcon,
  CircleHalfIcon,
  CircleNotchIcon,
  type Icon,
  XCircleIcon,
} from "@phosphor-icons/react";

export type EvalTone = "neutral" | "pending" | "positive" | "critical";

const TRIAL_TONES: Record<EvalTrialStatus, EvalTone> = {
  failed: "critical",
  passed: "positive",
  queued: "pending",
  running: "pending",
  void: "pending",
};

const TRIAL_GLYPHS: Record<EvalTrialStatus, Icon> = {
  failed: XCircleIcon,
  passed: CheckCircleIcon,
  queued: CircleDashedIcon,
  running: CircleNotchIcon,
  void: CircleHalfIcon,
};

export const trialGlyph = (status: EvalTrialStatus) => TRIAL_GLYPHS[status];
export const trialTone = (status: EvalTrialStatus) => TRIAL_TONES[status];
