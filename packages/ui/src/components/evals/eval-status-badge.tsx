import { StatusBadge } from "@anpord/ui/components/ui/status-badge";
import type { PresentedStatus } from "@anpord/ui/lib/evals/eval-status";

export function EvalStatusBadge({
  size,
  status,
}: {
  readonly size?: "sm" | "xs";
  readonly status: PresentedStatus;
}) {
  return (
    <StatusBadge
      icon={status.icon}
      size={size}
      spin={status.spin}
      tone={status.tone}
    >
      {status.label}
    </StatusBadge>
  );
}
