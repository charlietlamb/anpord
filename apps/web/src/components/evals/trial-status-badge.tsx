import type { EvalTrialStatus } from "@anpord/schema/domain/evals";
import { StatusBadge } from "@anpord/ui/components/ui/status-badge";

const TONE: Record<
  EvalTrialStatus,
  "critical" | "neutral" | "pending" | "positive"
> = {
  exceeded: "neutral",
  failed: "critical",
  passed: "positive",
  queued: "neutral",
  running: "pending",
  void: "neutral",
};

const LABEL: Record<EvalTrialStatus, string> = {
  exceeded: "Over budget",
  failed: "Failed",
  passed: "Passed",
  queued: "Queued",
  running: "Running",
  /* Never "failed". A trial whose commands never executed says nothing about
   * the agent, and showing it as a failure is the mistake the whole system
   * exists to prevent. Its own component so a refactor cannot merge the two. */
  void: "No evidence",
};

export function TrialStatusBadge({ status }: { status: EvalTrialStatus }) {
  return <StatusBadge tone={TONE[status]}>{LABEL[status]}</StatusBadge>;
}
