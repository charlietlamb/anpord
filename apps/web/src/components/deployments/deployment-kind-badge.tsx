import type { DeploymentKind } from "@anpord/schema/domain/deployments";
import { StatusBadge } from "@anpord/ui/components/ui/status-badge";

const TONES = {
  first: "positive",
  promotion: "positive",
  repeat: "neutral",
  rollback: "pending",
} as const;

const LABELS = {
  first: "First deploy",
  promotion: "Promotion",
  repeat: "Repeat",
  rollback: "Rollback",
} as const;

interface DeploymentKindBadgeProps {
  readonly kind: DeploymentKind;
}

/** A rollback reads as pending rather than critical: moving back is a
 * deliberate act and usually the fix, not the incident. */
export function DeploymentKindBadge({ kind }: DeploymentKindBadgeProps) {
  return <StatusBadge tone={TONES[kind]}>{LABELS[kind]}</StatusBadge>;
}
