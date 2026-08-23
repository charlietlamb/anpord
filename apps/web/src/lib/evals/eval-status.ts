import type {
  EvalRunStatus,
  EvalTrialStatus,
  EvalVerdict,
} from "@anpord/schema/domain/evals";
import {
  CheckCircleIcon,
  CircleDashedIcon,
  CircleHalfIcon,
  CircleNotchIcon,
  EqualsIcon,
  type Icon,
  MinusCircleIcon,
  ProhibitInsetIcon,
  TrendDownIcon,
  TrendUpIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { createElement } from "react";

export type EvalTone = "neutral" | "pending" | "positive" | "critical";

const RUN_TONES: Record<EvalRunStatus, EvalTone> = {
  failed: "critical",
  finished: "positive",
  running: "pending",
};

const TRIAL_TONES: Record<EvalTrialStatus, EvalTone> = {
  exceeded: "critical",
  failed: "critical",
  passed: "positive",
  queued: "pending",
  running: "pending",
  void: "pending",
};

const RUN_GLYPHS: Record<EvalRunStatus, Icon> = {
  failed: XCircleIcon,
  finished: CheckCircleIcon,
  running: CircleNotchIcon,
};

const TRIAL_GLYPHS: Record<EvalTrialStatus, Icon> = {
  exceeded: ProhibitInsetIcon,
  failed: XCircleIcon,
  passed: CheckCircleIcon,
  queued: CircleDashedIcon,
  running: CircleNotchIcon,
  void: CircleHalfIcon,
};

const VERDICT_GLYPHS: Record<EvalVerdict, Icon> = {
  improved: TrendUpIcon,
  incomparable: MinusCircleIcon,
  regressed: TrendDownIcon,
  unchanged: EqualsIcon,
};

const VERDICT_TONES: Record<EvalVerdict, EvalTone> = {
  improved: "positive",
  incomparable: "neutral",
  regressed: "critical",
  unchanged: "neutral",
};

const RAIL_TONES = {
  critical: "critical",
  neutral: "muted",
  pending: "warning",
  positive: "positive",
} as const;

export const runGlyph = (status: EvalRunStatus) => RUN_GLYPHS[status];
export const runTone = (status: EvalRunStatus) => RUN_TONES[status];
export const trialGlyph = (status: EvalTrialStatus) => TRIAL_GLYPHS[status];
export const trialTone = (status: EvalTrialStatus) => TRIAL_TONES[status];

export const runStatusMark = (status: EvalRunStatus) => {
  const Glyph = runGlyph(status);

  return {
    Icon: ({ className }: { readonly className?: string }) =>
      createElement(Glyph, {
        className,
        weight: status === "running" ? "bold" : "fill",
      }),
    tone: RAIL_TONES[runTone(status)],
  };
};

export const verdictMark = (verdict: EvalVerdict) => ({
  Icon: VERDICT_GLYPHS[verdict],
  tone: RAIL_TONES[VERDICT_TONES[verdict]],
});
