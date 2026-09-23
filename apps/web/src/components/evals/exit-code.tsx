import { StatusBadge } from "@anpord/ui/components/ui/status-badge";
import { WarningCircleIcon } from "@phosphor-icons/react";

export function ExitCode({ code }: { readonly code: number | null }) {
  if (code === null || code === 0) {
    return null;
  }

  return (
    <StatusBadge icon={WarningCircleIcon} size="xs" tone="pending">
      exit {code}
    </StatusBadge>
  );
}
