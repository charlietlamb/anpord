import type {
  EvalRunStatus,
  EvalTrialStatus,
  EvalVerdict,
} from "@anpord/schema/domain/evals";
import { StatusBadge } from "@anpord/ui/components/ui/status-badge";
import { cn } from "@anpord/ui/lib/utils";
import {
  CheckCircleIcon,
  CircleDashedIcon,
  CircleHalfIcon,
  CircleNotchIcon,
  type Icon,
  ProhibitInsetIcon,
  XCircleIcon,
} from "@phosphor-icons/react";

type Tone = "neutral" | "pending" | "positive" | "critical";

const RUN_TONES: Record<EvalRunStatus, Tone> = {
  failed: "critical",
  finished: "positive",
  running: "pending",
};

const TRIAL_GLYPHS: Record<EvalTrialStatus, Icon> = {
  /* Ran past its ceiling rather than answering wrongly, which is a limit hit
     and not a verdict. */
  exceeded: ProhibitInsetIcon,
  failed: XCircleIcon,
  passed: CheckCircleIcon,
  queued: CircleDashedIcon,
  running: CircleNotchIcon,
  /* Nothing filled it in: no evidence either way, which is the one state a
     tick or a cross would both misreport. */
  void: CircleHalfIcon,
};

const TONE_CLASSES: Record<Tone, string> = {
  critical: "text-destructive",
  neutral: "text-muted-foreground",
  pending: "text-warning",
  positive: "text-success",
};

/** The verdict as a mark that means something on its own, for a rail row where
 * the icon is the only label the state gets. */
export function TrialStatusIcon({
  status,
}: {
  readonly status: EvalTrialStatus;
}) {
  const Glyph = TRIAL_GLYPHS[status];

  return (
    <Glyph
      className={cn("size-3.5 shrink-0", TONE_CLASSES[TRIAL_TONES[status]])}
      weight="bold"
    />
  );
}

const TRIAL_TONES: Record<EvalTrialStatus, Tone> = {
  exceeded: "critical",
  failed: "critical",
  passed: "positive",
  queued: "pending",
  running: "pending",
  /* Pending rather than critical, and the whole argument of the product is in
     that choice: a void trial is a measurement that did not happen, not a
     failing one. Reading an outage as a failure is what lets a broken
     provider report a clean rate. */
  void: "pending",
};

const VERDICT_TONES: Record<EvalVerdict, Tone> = {
  improved: "positive",
  /* Never critical. A cell with nothing to compare against has not collapsed;
     it has no answer, and a red badge would announce a regression that never
     happened. */
  incomparable: "neutral",
  regressed: "critical",
  unchanged: "neutral",
};

/* The xs variant is 20px tall with 10px type, which is what Linear sizes a
   status badge at: the badge is the tallest thing in a row, so it decides how
   dense the row can be. */
export function RunStatusBadge({ status }: { readonly status: EvalRunStatus }) {
  return (
    <StatusBadge size="xs" tone={RUN_TONES[status]}>
      {status}
    </StatusBadge>
  );
}

export function TrialStatusBadge({
  status,
}: {
  readonly status: EvalTrialStatus;
}) {
  return (
    <StatusBadge size="xs" tone={TRIAL_TONES[status]}>
      {status}
    </StatusBadge>
  );
}

export function VerdictBadge({
  delta,
  verdict,
}: {
  /** Absent for a verdict that is not a movement, so `incomparable` never
   * carries a number that would read as one. */
  readonly delta?: number;
  readonly verdict: EvalVerdict;
}) {
  const movement =
    verdict === "improved" || verdict === "regressed" ? delta : undefined;

  return (
    <StatusBadge size="xs" tone={VERDICT_TONES[verdict]}>
      {verdict}
      {movement === undefined ? null : (
        <span className="tabular-nums">
          {movement > 0 ? "+" : ""}
          {movement.toFixed(2)}
        </span>
      )}
    </StatusBadge>
  );
}
