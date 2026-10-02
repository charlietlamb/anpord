import { WarningCircleIcon } from "@phosphor-icons/react";
import { StatusBadge } from "@sphynx/ui/components/ui/status-badge";

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
